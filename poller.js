import {
    POLLER_FALLBACK_SLEEP_TIME,
    MAX_REQUESTS_LIMIT,
    MAX_REQUEST_LIMIT_EXHAUSTION_TIME,
    AGE_PREFERENCE_PRISMA_CONDITION,
    SUBSEQUENT_REQUEST_DELAY,
    COWIN_DATE_FORMAT
} from './constants.js'
import { DateTime } from 'luxon'
import prismaPackage from '@prisma/client'
import { searchCalendarByDistrict, searchCalendarByPin } from './cowin-api.js';
import _ from 'lodash'
const { PrismaClient } = prismaPackage

const pincodesToSearch = [];
const districtIdsToSearch = [];

let pollerTimeoutSet = false;

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

        /*
        pollerTimeoutSet prevents calling setTimeout multiple times preventing poller from 
        being instatiated multiple times
        */

        if (!pollerTimeoutSet) {
            pollerTimeoutSet = true;
            setTimeout(async () => {
                pollerTimeoutSet = false;
                await pollData()
            }, calculateTimeout(error.response.status == 403) * 1000)
        }
    } finally {
        if (!pollerTimeoutSet) {
            pollerTimeoutSet = true;
            setTimeout(async () => {
                pollerTimeoutSet = false;
                await pollData()
            }, calculateTimeout() * 1000)
        }
    }

}

function calculateTimeout(is403 = false) {
    const timeDelta = requestEndTime.diff(requestStartTime, 'seconds').seconds;
    let timeout = POLLER_FALLBACK_SLEEP_TIME;

    if ((timeDelta > MAX_REQUEST_LIMIT_EXHAUSTION_TIME) && (requestCount == MAX_REQUESTS_LIMIT))
        timeout = MAX_REQUEST_LIMIT_EXHAUSTION_TIME - timeDelta + 60; // we add an addition one minute 
    if (is403)
        timeout = MAX_REQUEST_LIMIT_EXHAUSTION_TIME + 60
    return timeout;
}

async function pollByPincode() {

    let currentDate = DateTime.now().toFormat(COWIN_DATE_FORMAT);
    const count = pincodesToSearch.length;
    let lastElement;

    try {
        for (let i = 0; i < count; ++i) {
            if (requestCount == MAX_REQUESTS_LIMIT)
                break;
            const element = pincodesToSearch.shift();
            lastElement = element;
            let centers = await searchCalendarByPin(element.pincode, currentDate)
            await delay(SUBSEQUENT_REQUEST_DELAY * 1000);
            ++requestCount;
            console.log(`Last request count: ${requestCount}`)
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
        throw exception;
    }
}

async function pollByDistrictId() {
    let currentDate = DateTime.now().toFormat(COWIN_DATE_FORMAT);
    const count = districtIdsToSearch.length;
    let lastElement;

    try {
        for (let i = 0; i < count; ++i) {
            if (requestCount == MAX_REQUESTS_LIMIT)
                break;
            const element = districtIdsToSearch.shift();
            lastElement = element;
            let centers = await searchCalendarByDistrict(element.districtId, currentDate)
            await delay(SUBSEQUENT_REQUEST_DELAY * 1000);
            ++requestCount;
            console.log(`Last request count: ${requestCount}`)
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
        throw exception;
    }
}

async function sendNotificationToUser(user, center, session) {

    let hasBeenNotified = false;

    let userNotificationDetails = await prisma.userNotificationDetail.findMany({
        where: {
            userId: user.id,
            centerId: center.center_id,
            minimumAgeLimit: session.min_age_limit,
            availableCapacity: session.available_capacity,
            vaccine: session.vaccine,
            sessionId: session.session_id,
            dateOfVaccination: DateTime.fromFormat(session.date, COWIN_DATE_FORMAT).toISO()
        }
    });

    let userNotificationDetail = _.first(userNotificationDetails);

    // He has not been notified yet or with the same data.

    if (userNotificationDetail == null) {
        getTelegramBot().telegram.sendMessage(user.telegramId,
            `*${center.name}* located at *${center.address}* has ` +
            `*${session.available_capacity}* vacant slots for minimum age limit of ` +
            `*${session.min_age_limit}\\+*\\ for date ` +
            `*${DateTime.fromFormat(session.date, COWIN_DATE_FORMAT).toLocaleString(DateTime.DATE_FULL)}*. Hurry up\\!`,
            { parse_mode: "MarkdownV2" })

        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                lastNotified: DateTime.now().toISO()
            }
        });

        hasBeenNotified = true;
    }

    //Now we have to figure out if he has been notified with updated data of a center or entirely new data
    if (hasBeenNotified) {

        //If its updated data, only the availability of slots might have changed.
        let details = await prisma.userNotificationDetail.findMany({
            where: {
                userId: user.id,
                centerId: center.center_id,
                minimumAgeLimit: session.min_age_limit,
                vaccine: session.vaccine,
                sessionId: session.session_id,
                dateOfVaccination: DateTime.fromFormat(session.date, COWIN_DATE_FORMAT).toISO()
            }
        });

        let detail = _.first(details);

        //Data exists but has been updated
        if (detail) {
            await prisma.userNotificationDetail.update({
                where: {
                    id: detail.id
                },
                data: {
                    availableCapacity: session.available_capacity,
                }
            })
        }
        //Entirely new data
        else {
            await prisma.userNotificationDetail.create({
                data: {
                    userId: user.id,
                    centerId: center.center_id,
                    minimumAgeLimit: session.min_age_limit,
                    availableCapacity: session.available_capacity,
                    vaccine: session.vaccine,
                    sessionId: session.session_id,
                    dateOfVaccination: DateTime.fromFormat(session.date, COWIN_DATE_FORMAT).toISO()
                }
            })
        }
    }
}

function delay(t) {
    return new Promise(resolve => setTimeout(resolve, t));
}