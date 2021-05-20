import axios from "axios";
import fs from 'fs';

async function getAllStates() {
    const {data} = await axios.get('https://cdn-api.co-vin.in/api/v2/admin/location/states',
        {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.62'
            }
        });
    return data.states;
}

async function getDistrictsForStateId(id) {
    const {data} = await axios.get(`https://cdn-api.co-vin.in/api/v2/admin/location/districts/${id}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36 Edg/90.0.818.62'
        }
    })
    return data.districts;
}

let data = [];
let allDistricts = [];
let allStates = [];
(async () => {

    const states = await getAllStates();
    allStates = states;
    for (let i = 0; i < states.length; ++i) {
        const districts = await getDistrictsForStateId(states[i].state_id);
        allDistricts = allDistricts.concat(districts);
        data.push({
            ...states[i],
            districts: districts
        })
    }
    fs.writeFileSync('state-district-data.js', JSON.stringify(data));
    fs.writeFileSync('district-data.js', JSON.stringify(allDistricts));
    fs.writeFileSync('state-data.js', JSON.stringify(allStates));
    console.log(data);
})();