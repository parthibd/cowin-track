import { AGE_PREFERENCE } from './constants.js'
import { DateTime } from 'luxon'
import prismaPackage from '@prisma/client'
import { searchCalendarByDistrict, searchCalendarByPin } from './cowin-api.js';
const { PrismaClient } = prismaPackage

const pincodesToSearch = [];
const districtIdsToSearch = [];

const POLLER_FALLBACK_SLEEP_TIME = 30; //In seconds

let telegramBot = null;

const prisma = new PrismaClient()

export function setTelegramBot(bot) {
    telegramBot = bot;
}

function getTelegramBot() {
    return telegramBot;
}

export async function pollData() {
    let result = null;
    if (pincodesToSearch.length == 0) {
        result = await prisma.user.findMany({
            where: {
                pincode: {
                    not: {
                        equals: null
                    }
                }
            },
            select: {
                pincode: true
            },
            distinct: ['pincode']
        })

        pincodesToSearch.push(...result);
    }

    if (districtIdsToSearch.length == 0) {
        result = await prisma.user.findMany({
            where: {
                districtId: {
                    not: {
                        equals: null
                    }
                },
                AND: {
                    pincode: {
                        equals: null
                    }
                }
            },
            select: {
                districtId: true
            },
            distinct: ['districtId']
        })

        districtIdsToSearch.push(...result);

    }

    try {
        await Promise.all([pollByPincode(), pollByDistrictId()])
        setTimeout(async () => {
            await pollData()
        }, POLLER_FALLBACK_SLEEP_TIME * 1000)
    } catch (error) {
        setTimeout(async () => {
            await pollData()
        }, POLLER_FALLBACK_SLEEP_TIME * 1000)
    }

}

async function pollByPincode() {

    let currentDate = DateTime.now().toFormat('dd-MM-yyyy');
    const count = pincodesToSearch.length;
    let lastElement;

    try {
        for (let i = 0; i < count; ++i) {
            const element = pincodesToSearch.shift();
            lastElement = element;
            let centers = await searchCalendarByPin(element.pincode, currentDate)
            let users = [];

            centers.forEach(center => {
                center.sessions.forEach(async (session) => {
                    if (session.available_capacity)
                        switch (session.min_age_limit) {
                            case 45:
                                users = await prisma.user.findMany({
                                    where: {
                                        pincode: element.pincode,
                                        agePreference: {
                                            in: [AGE_PREFERENCE.FORTYFIVE_PLUS, AGE_PREFERENCE.BOTH]
                                        }
                                    }
                                })
                                users.forEach(user => {
                                    sendNotificationToUser(user, center, session);
                                });
                                break;
                            case 18:
                                users = await prisma.user.findMany({
                                    where: {
                                        pincode: element.pincode,
                                        agePreference: {
                                            in: [AGE_PREFERENCE.EIGHTEEN_PLUS, AGE_PREFERENCE.BOTH]
                                        }
                                    }
                                })
                                users.forEach(user => {
                                    sendNotificationToUser(user, center, session);
                                });
                                break;
                        }
                })
            });


        }
    }
    catch (exception) {
        pincodesToSearch.push(element);
        setTimeout(() => {
            pollByPincode();
        }, POLLER_FALLBACK_SLEEP_TIME * 1000)
    }

}

async function pollByDistrictId() {
    let currentDate = DateTime.now().toFormat('dd-MM-yyyy');
    const count = districtIdsToSearch.length;
    let lastElement;

    try {
        for (let i = 0; i < count; ++i) {
            const element = districtIdsToSearch.shift();
            lastElement = element;
            let centers = await searchCalendarByDistrict(element.districtId, currentDate)
            let users = [];

            centers.forEach(center => {
                center.sessions.forEach(async (session) => {
                    if (session.available_capacity)
                        switch (session.min_age_limit) {
                            case 45:
                                users = await prisma.user.findMany({
                                    where: {
                                        districtId: element.districtId,
                                        agePreference: {
                                            in: [AGE_PREFERENCE.FORTYFIVE_PLUS, AGE_PREFERENCE.BOTH]
                                        }
                                    }
                                })
                                users.forEach(user => {
                                    sendNotificationToUser(user, center, session);
                                });
                                break;
                            case 18:
                                users = await prisma.user.findMany({
                                    where: {
                                        districtId: element.districtId,
                                        agePreference: {
                                            in: [AGE_PREFERENCE.EIGHTEEN_PLUS, AGE_PREFERENCE.BOTH]
                                        }
                                    }
                                })
                                users.forEach(user => {
                                    sendNotificationToUser(user, center, session);
                                });
                                break;
                        }
                })
            });


        }
    }
    catch (exception) {
        pincodesToSearch.push(element);
        setTimeout(() => {
            pollByDistrictId();
        }, POLLER_FALLBACK_SLEEP_TIME * 1000)
    }
}

function sendNotificationToUser(user, center, session) {
    getTelegramBot().telegram.sendMessage(user.telegramId, `*${center.name}* has *${session.available_capacity}* vacant slots\\. Hurry up\\!`, { parse_mode: "MarkdownV2" })
}