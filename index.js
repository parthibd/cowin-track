import Fuse from 'fuse.js'
import dotenv from 'dotenv'
import prismaPackage from '@prisma/client'
import { states } from "./state-data.js"
import { districts } from "./district-data.js"
import { Telegraf, Markup } from 'telegraf'
import _ from 'lodash'
import pincodeDirectory from 'india-pincode-lookup'
import { setTelegramBot, pollData } from './poller.js'
import {
    AGE_PREFERENCE,
    optionsDistrictsSearch,
    optionsStatesSearch,
    CONVERSATION_STEPS
} from './constants.js'
const { PrismaClient } = prismaPackage

const prisma = new PrismaClient()

dotenv.config()

const fuseStates = new Fuse(states, optionsStatesSearch);
const fuseDistricts = new Fuse(districts, optionsDistrictsSearch);


const token = process.env.BOT_TOKEN
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)

setTelegramBot(bot);

bot.use(Telegraf.log())


bot.start(async (ctx) => {

    const user = await prisma.user.findFirst({
        where: {
            telegramId: ctx.from.id,
            ConversationState: {
                conversationStep: CONVERSATION_STEPS.INPUT_ACQUIRED_SUCCESSFULLY
            }
        },
        include: {
            ConversationState: true
        }
    })

    if (user != null) {
        ctx.reply(
            'Hey there!👋 \n\n' +
            'Welcome welcome back! \n\n' +
            'Your notification preferences are already saved. Do you want to clear them?',
            Markup.inlineKeyboard([
                Markup.button.callback('Go ahead!', 'clear_preference'),
                Markup.button.callback('Let it be!', 'noop_clear_preferences')])
        )
    }

    else {

        //Create an empty user with associated relation.

        await prisma.user.upsert({
            where: {
                telegramId: ctx.from.id
            },
            create: {
                telegramId: ctx.from.id,
                pincode: null,
                stateId: null,
                districtId: null,
                ConversationState: {
                    create: {
                        conversationStep: CONVERSATION_STEPS.NO_INPUT_PRESENT
                    }
                }
            },
            update: {
                pincode: null,
                stateId: null,
                districtId: null,
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
                Markup.button.callback('Pincode', 'notify_by_pincode')])
        );
    }
})

bot.action('noop_clear_preferences', async (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(
        'No problem! \n\n' +
        'You\'re awesome! \n\n')
})

bot.action('clear_preference', async (ctx) => {

    await prisma.user.upsert({
        where: {
            telegramId: ctx.from.id
        },
        create: {
            telegramId: ctx.from.id,
            pincode: null,
            stateId: null,
            districtId: null,
            ConversationState: {
                create: {
                    conversationStep: null
                }
            }
        },
        update: {
            pincode: null,
            stateId: null,
            districtId: null,
            ConversationState: {
                update: {
                    conversationStep: null
                }
            }
        }
    })

    ctx.reply(
        'No problem! \n\n' +
        'Let\'s start over! \n\n')
    ctx.reply('Please tap /start to begin.');
})

bot.action('notify_by_district', async (ctx) => {
    ctx.answerCbQuery();
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
    ctx.answerCbQuery()
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

bot.action(/age_select_([0-9]*_*[a-z]+)/, async (ctx) => {
    switch (ctx.match[1]) {
        case '45_plus':
            await setAgePreference(ctx, AGE_PREFERENCE.FORTYFIVE_PLUS)
            break;
        case '18_plus':
            await setAgePreference(ctx, AGE_PREFERENCE.EIGHTEEN_PLUS);
            break;
        case 'both':
            await setAgePreference(ctx, AGE_PREFERENCE.BOTH)
            break;
    }
    ctx.answerCbQuery();

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
                ctx.reply('Please provide valid input.');
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
                ctx.reply('Please provide valid input.');
                break;
            default:
                ctx.reply('Please provide valid input.');
                break;
        }
})


bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))


async function handleStateInput(ctx, user) {

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

        ctx.replyWithMarkdown(`Great! Your state has been set to *${stateInput.trim()}*. Please type the name of the district now.`, {
        })

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
                        conversationStep: CONVERSATION_STEPS.INPUT_AGE
                    }
                }
            }
        })
        ctx.replyWithMarkdown(`Great! Your district has been set to *${districtInput.trim()}*.`)
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
                        conversationStep: CONVERSATION_STEPS.INPUT_AGE
                    }
                }
            }
        })
        ctx.replyWithMarkdown(`Great! Your pincode has been set to *${pincodeData.pincode}*.`)
        showAgeSelectKeyboard(ctx)
    } else {
        ctx.reply(`Oops! No such pincode exists. Please retry.`)
    }
}


function showAgeSelectKeyboard(ctx) {
    ctx.reply('Final step! Please select you age preference.',
        Markup.inlineKeyboard([
            Markup.button.callback('45+', 'age_select_45_plus'),
            Markup.button.callback('18+', 'age_select_18_plus'),
            Markup.button.callback('Both', 'age_select_both')]));
}

async function setAgePreference(ctx, agePreference) {
    await prisma.user.update({
        where: {
            telegramId: ctx.from.id
        },
        data: {
            agePreference: agePreference,
            ConversationState: {
                update: {
                    conversationStep: CONVERSATION_STEPS.INPUT_ACQUIRED_SUCCESSFULLY
                }
            }
        }
    })
    ctx.replyWithMarkdown(`Great! Your age preference has been set.`)
    ctx.reply('All done! Please wait while I save your preferences.')
    ctx.reply('Preferences saved! You will be notified as soon as the slot opens.Stay tuned!. 😎')
}


(async () => {
    await pollData();
})();