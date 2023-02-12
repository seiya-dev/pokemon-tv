const gotCfg = {
    headers: { 
        'user-agent': [
            'Mozilla/5.0',
            '(Windows NT 10.0; Win64; x64; rv:70.0)',
            'Gecko/20100101 Firefox/70.0',
        ].join(' '),
    },
};

const tvRegion = [
    'us', 'uk', 'fr', 'it',
    'de', 'es', 'el', 'br',
    'ru', 'dk', 'nl', 'fi', 
    'no', 'se',
];

const proxyCode = {
    uk: 'gb',
    el: 'mx',
};


import { execSync } from 'node:child_process';
import * as dotenv from 'dotenv';
import gm from 'got';

dotenv.config();
const user = process.env.PROXY_USER;
const pass = process.env.PROXY_PASS;
const got = gm.extend(gotCfg);

try{
    const proxyData = await got('https://assets.windscribe.com/serverlist/firefox/1/1');
    const proxyJson = JSON.parse(proxyData.body);
    for(let tvr of tvRegion){
        const cc = proxyCode[tvr] ? proxyCode[tvr] : tvr;
        const px = proxyJson.data.filter(i => {
            return i.country_code.toLowerCase() == cc;
        });
        if(px){
            const proxyHost = px.reverse()[0].groups[0].hosts[0].hostname;
            execSync(`node app.js --proxy "https://${user}:${pass}@${proxyHost}/" --cc ${tvr}`, { stdio: 'inherit' });
        }
    }
}
catch(e){
    console.log('[error] update failed!');
    console.log(e);
}
