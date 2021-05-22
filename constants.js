export const AGE_PREFERENCE = {
    EIGHTEEN_PLUS: 'EIGHTEEN_PLUS',
    FORTYFIVE_PLUS: 'FORTYFIVE_PLUS',
    BOTH: 'BOTH'
}

export const optionsStatesSearch = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    keys: [
        "state_name"
    ]
};

export const optionsDistrictsSearch = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    keys: [
        "district_name"
    ]
};

export const CONVERSATION_STEPS = {
    INPUT_STATE_NAME: 'INPUT_STATE_NAME',
    INPUT_DISTRICT_NAME: 'INPUT_DISTRICT_NAME',
    INPUT_PINCODE: 'INPUT_PINCODE',
    INPUT_AGE: 'INPUT_AGE',
    INPUT_ACQUIRED_SUCCESSFULLY: 'INPUT_ACQUIRED_SUCCESSFULLY',
    NO_INPUT_PRESENT: 'NO_INPUT_PRESENT'
}

export const POLLER_FALLBACK_SLEEP_TIME = 30; //In seconds
export const USER_NOTIFICATION_TIME_DELAY = 30 * 60; //30 minutes

export const MAX_REQUESTS_LIMIT = 100;
export const MAX_REQUEST_LIMIT_EXHAUSTION_TIME = 5 * 60; //5 minutes

export const AGE_PREFERENCE_PRISMA_CONDITION = {
    45: [AGE_PREFERENCE.FORTYFIVE_PLUS, AGE_PREFERENCE.BOTH],
    18: [AGE_PREFERENCE.EIGHTEEN_PLUS, AGE_PREFERENCE.BOTH]
};

export const SUBSEQUENT_REQUEST_DELAY = 5; //in seconds

export const COWIN_AXIOS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.62'
};