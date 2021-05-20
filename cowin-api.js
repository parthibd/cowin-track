import axios from "axios";


export async function searchCalendarByPin(pincode, date) {
    const queryParams = new URLSearchParams({
        pincode: pincode,
        date: date
    }).toString();

    const { data } = await axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?${queryParams}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.62'
        }
    });
    return data.centers
}

export async function searchCalendarByDistrict(districtId, date) {
    const queryParams = new URLSearchParams({
        district_id: districtId,
        date: date
    }).toString();

    const { data } = await axios.get(`ttps://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?${queryParams}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.62'
        }
    })
    return data.centers;
}