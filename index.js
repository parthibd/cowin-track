import Fuse from 'fuse.js'
import dotenv from 'dotenv'
import prismaPackage from '@prisma/client'
import { states } from "./state-data.js"
import { districts } from "./district-data.js"
import { Telegraf, Markup } from 'telegraf'
import _ from 'lodash'
import pincodeDirectory from 'india-pincode-lookup'
import { setTelegramBot, pollData } from './poller.js'
import { AGE_PREFERENCE } from './constants.js'
const { PrismaClient } = prismaPackage

const prisma = new PrismaClient()

dotenv.config()

const optionsStatesSearch = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    keys: [
        "state_name"
    ]
};

const optionsDistrictsSearch = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    keys: [
        "district_name"
    ]
};

const fuseStates = new Fuse(states, optionsStatesSearch);
const fuseDistricts = new Fuse(districts, optionsDistrictsSearch);


const token = process.env.BOT_TOKEN
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!')
}

const CONVERSATION_STEPS = {
    INPUT_STATE_NAME: 'INPUT_STATE_NAME',
    INPUT_DISTRICT_NAME: 'INPUT_DISTRICT_NAME',
    INPUT_PINCODE: 'INPUT_PINCODE',
    INPUT_ACQUIRED_SUCCESSFULLY: 'INPUT_ACQUIRED_SUCCESSFULLY',
    NO_INPUT_PRESENT: 'NO_INPUT_PRESENT'
}

const bot = new Telegraf(token)

setTelegramBot(bot);

bot.use(Telegraf.log())


bot.start(async (ctx) => {

    await prisma.user.upsert({
        where: {
            telegramId: ctx.from.id
        },
        create: {
            telegramId: ctx.from.id,
            ConversationState: {
                create: {
                    conversationStep: CONVERSATION_STEPS.NO_INPUT_PRESENT
                }
            }
        },
        update: {
            ConversationState: {
                update: {
                    conversationStep: CONVERSATION_STEPS.NO_INPUT_PRESENT
                }
            }
        }
    })

    ctx.reply(
        'Hey there!👋 \n\n' +
        'Welcome to CowinTrack Bot \n\n' +
        'I will regularly check for empty slots in your area and will notify you as soon as they become available.\n\n' +
        'Lets start.')

    ctx.reply('Please select whether you want to be notified by specific district or pincode.',
        Markup.inlineKeyboard([
            Markup.button.callback('District', 'notify_by_district'),
            Markup.button.callback('Pincode', 'notify_by_pincode')]));
})

bot.action('notify_by_district', async (ctx) => {
    await prisma.user.update({
        where: {
            telegramId: ctx.from.id
        },
        data: {
            ConversationState: {
                update: {
                    conversationStep: CONVERSATION_STEPS.INPUT_STATE_NAME
                }
            }
        }
    })
    ctx.reply('Great! Please type the name of the state where you live in.')
})

bot.action('notify_by_pincode', async (ctx) => {

    await prisma.user.update({
        where: {
            telegramId: ctx.from.id
        },
        data: {
            ConversationState: {
                update: {
                    conversationStep: CONVERSATION_STEPS.INPUT_PINCODE
                }
            }
        }
    })
    ctx.reply('Great! Please enter your pincode.')
})

bot.on('message', async (ctx) => {

    const user = await prisma.user.findFirst({
        where: {
            telegramId: ctx.from.id
        },
        include: {
            ConversationState: true
        }
    });

    if (user != null)
        switch (user.ConversationState.conversationStep) {
            case CONVERSATION_STEPS.NO_INPUT_PRESENT:
                console.log("Pass")
                break;
            case CONVERSATION_STEPS.INPUT_STATE_NAME:
                handleStateInput(ctx, user);
                break;
            case CONVERSATION_STEPS.INPUT_DISTRICT_NAME:
                handleDistrictInput(ctx, user);
                break;
            case CONVERSATION_STEPS.INPUT_PINCODE:
                handlePinCodeInput(ctx, user);
                break;
            case CONVERSATION_STEPS.INPUT_ACQUIRED_SUCCESSFULLY:
                console.log('Pass');
                break;
        }
})


bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))


async function handleStateInput(ctx, user) {

    ctx.sendMessage()
    const stateInput = ctx.message.text
    let exactMatch = false;
    const stateMatch = _.find(states, function (data) {
        return data.state_name.trim().toLowerCase() == stateInput.trim().toLowerCase()
    })
    if (stateMatch)
        exactMatch = true;

    if (exactMatch) {
        await prisma.user.update({
            where: {
                telegramId: ctx.from.id
            },
            data: {
                stateId: stateMatch.state_id,
                ConversationState: {
                    update: {
                        conversationStep: CONVERSATION_STEPS.INPUT_DISTRICT_NAME
                    }
                }
            }
        })

        ctx.reply('Great! Found your state. Please type the name of the district now.')

    } else {
        const searchResult = fuseStates.search(stateInput.trim())
        ctx.replyWithMarkdown(`Oops! Did you mean *${searchResult[0].item.state_name}*? Please re-enter your state name.`)
        console.log(searchResult)
    }

}

async function handleDistrictInput(ctx, user) {
    const districtInput = ctx.message.text
    let exactMatch = false;
    const districtMatch = _.find(districts, function (data) {
        return data.district_name.trim().toLowerCase() == districtInput.trim().toLowerCase()
    })
    if (districtMatch)
        exactMatch = true;

    if (exactMatch) {
        await prisma.user.update({
            where: {
                telegramId: ctx.from.id
            },
            data: {
                districtId: districtMatch.district_id,
                ConversationState: {
                    update: {
                        conversationStep: CONVERSATION_STEPS.INPUT_ACQUIRED_SUCCESSFULLY
                    }
                }
            }
        })

        showAgeSelectKeyboard(ctx)

    } else {
        const searchResult = fuseDistricts.search(districtInput.trim())
        ctx.replyWithMarkdown(`Oops! Did you mean *${searchResult[0].item.district_name}*? Please re-enter your district name.`)
        console.log(searchResult)
    }
}

async function handlePinCodeInput(ctx, user) {
    const pinCodeInput = ctx.message.text
    const lookupResult = pincodeDirectory.lookup(pinCodeInput.trim())
    const pincodeData = _.first(lookupResult);
    let exactMatch = false;
    if (pincodeData)
        exactMatch = true;
    if (exactMatch) {
        await prisma.user.update({
            where: {
                telegramId: ctx.from.id
            },
            data: {
                pincode: pincodeData.pincode,
                ConversationState: {
                    update: {
                        conversationStep: CONVERSATION_STEPS.INPUT_ACQUIRED_SUCCESSFULLY
                    }
                }
            }
        })
        showAgeSelectKeyboard(ctx)
    } else {
        ctx.reply(`Oops! No such pincode exists. Please retry.`)
    }
}


function showAgeSelectKeyboard(ctx) {
    ctx.reply('Final step! Please select you age preference.',
        Markup.inlineKeyboard([
            Markup.button.callback('45+', '45_plus_age_select'),
            Markup.button.callback('18+', '18_plus_age_select'),
            Markup.button.callback('Both', 'both_age_select')]));
}


bot.action('45_plus_age_select', async (ctx) => {
    await prisma.user.update({
        where: {
            telegramId: ctx.from.id
        },
        data: {
            agePreference: AGE_PREFERENCE.FORTYFIVE_PLUS
        }
    })
    ctx.reply('All done! Please wait while I save your preferences.')
    ctx.reply('Preferences saved! You will be notified as soon as the slot opens.Stay tuned!. 😎')
})
bot.action('18_plus_age_select', async (ctx) => {
    await prisma.user.update({
        where: {
            telegramId: ctx.from.id
        },
        data: {
            agePreference: AGE_PREFERENCE.EIGHTEEN_PLUS
        }
    })
    ctx.reply('All done! Please wait while I save your preferences.')
    ctx.reply('Preferences saved! You will be notified as soon as the slot opens.Stay tuned!. 😎')
})
bot.action('both_age_select', async (ctx) => {
    await prisma.user.update({
        where: {
            telegramId: ctx.from.id
        },
        data: {
            agePreference: AGE_PREFERENCE.BOTH
        }
    })
    ctx.reply('All done! Please wait while I save your preferences.')
    ctx.reply('Preferences saved! You will be notified as soon as the slot opens.Stay tuned!. 😎')
});

(async () => {
    await pollData();
})();