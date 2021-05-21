import { AGE_PREFERENCE } from './constants.js'
import { DateTime } from 'luxon'
import prismaPackage from '@prisma/client'
import { searchCalendarByDistrict, searchCalendarByPin } from './cowin-api.js';
const { PrismaClient } = prismaPackage

const pincodesToSearch = [];
const districtIdsToSearch = [];

const POLLER_FALLBACK_SLEEP_TIME = 30; //In seconds
const USER_NOTIFICATION_TIME_DELAY = 30 * 60; //30 minutes

const MAX_REQUESTS_LIMIT = 100;
const MAX_REQUEST_LIMIT_EXHAUSTION_TIME = 5 * 60; //5 minutes

const AGE_PREFERENCE_PRISMA_CONDITION = {
    45: [AGE_PREFERENCE.FORTYFIVE_PLUS, AGE_PREFERENCE.BOTH],
    18: [AGE_PREFERENCE.EIGHTEEN_PLUS, AGE_PREFERENCE.BOTH]
};

let requestCount = 0;
let requestStartTime = null;
let requestEndTime = null;

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
        requestStartTime = DateTime.now()
        await Promise.all([pollByPincode(), pollByDistrictId()])
        requestEndTime = DateTime.now()
    } catch (error) {
        requestEndTime = DateTime.now()
        setTimeout(async () => {
            await pollData()
        }, calculateTimeout() * 1000)
    } finally {
        setTimeout(async () => {
            await pollData()
        }, calculateTimeout() * 1000)
    }

}

function calculateTimeout() {
    const timeDelta = requestEndTime.diff(requestStartTime, 'seconds').seconds;
    let timeout = POLLER_FALLBACK_SLEEP_TIME;

    if (timeDelta > MAX_REQUEST_LIMIT_EXHAUSTION_TIME)
        timeout = MAX_REQUEST_LIMIT_EXHAUSTION_TIME - timeDelta - 60; // we add an addition one minute 
    return timeout;
}

async function pollByPincode() {

    let currentDate = DateTime.now().toFormat('dd-MM-yyyy');
    const count = pincodesToSearch.length;
    let lastElement;

    try {
        for (let i = 0; i < count; ++i) {
            if (requestCount == MAX_REQUESTS_LIMIT)
                break;
            const element = pincodesToSearch.shift();
            lastElement = element;
            let centers = await searchCalendarByPin(element.pincode, currentDate)
            ++requestCount;
            let users = [];

            centers.forEach(center => {
                center.sessions.forEach(async (session) => {
                    if (session.available_capacity) {
                        users = await prisma.user.findMany({
                            where: {
                                pincode: element.pincode,
                                agePreference: {
                                    in: AGE_PREFERENCE_PRISMA_CONDITION[session.min_age_limit]
                                }
                            }
                        })
                        users.forEach(async user => {
                            await sendNotificationToUser(user, center, session);
                        });
                    }
                })
            });

        }
    }
    catch (exception) {
        pincodesToSearch.push(lastElement);
        console.log(exception);
    }

}

async function pollByDistrictId() {
    let currentDate = DateTime.now().toFormat('dd-MM-yyyy');
    const count = districtIdsToSearch.length;
    let lastElement;

    try {
        for (let i = 0; i < count; ++i) {
            if (requestCount == MAX_REQUESTS_LIMIT)
                break;
            const element = districtIdsToSearch.shift();
            lastElement = element;
            let centers = await searchCalendarByDistrict(element.districtId, currentDate)
            ++requestCount;
            let users = [];

            centers.forEach(center => {
                center.sessions.forEach(async (session) => {
                    if (session.available_capacity) {
                        users = await prisma.user.findMany({
                            where: {
                                districtId: element.districtId,
                                agePreference: {
                                    in: AGE_PREFERENCE_PRISMA_CONDITION[session.min_age_limit]
                                }
                            }
                        })
                        users.forEach(async user => {
                            await sendNotificationToUser(user, center, session);
                        });
                    }
                })
            });
        }
    }
    catch (exception) {
        districtIdsToSearch.push(lastElement);
        console.log(exception);
    }
}

async function sendNotificationToUser(user, center, session) {
   
    // if ((user.lastNotified && DateTime.now().diff(DateTime.fromISO(user.lastNotified), 'seconds').seconds >= USER_NOTIFICATION_TIME_DELAY) || user.lastNotified == null) {
    // }

    getTelegramBot().telegram.sendMessage(user.telegramId, `*${center.name}* located at *${center.address}* has`+
    ` *${session.available_capacity}* vacant slots\\. Hurry up\\!`, { parse_mode: "MarkdownV2" })
    await prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            lastNotified: DateTime.now().toISO()
        }
    });
}