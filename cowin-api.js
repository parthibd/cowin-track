import axios from "axios";
import { COWIN_AXIOS_HEADERS } from './constants.js'


export async function searchCalendarByPin(pincode, date) {
    const queryParams = new URLSearchParams({
        pincode: pincode,
        date: date
    }).toString();

    const { data } = await axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?${queryParams}`, {
        headers: COWIN_AXIOS_HEADERS
    });
    return data.centers
}

export async function searchCalendarByDistrict(districtId, date) {
    const queryParams = new URLSearchParams({
        district_id: districtId,
        date: date
    }).toString();

    const { data } = await axios.get(`ttps://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?${queryParams}`, {
        headers: COWIN_AXIOS_HEADERS
    })
    return data.centers;
}