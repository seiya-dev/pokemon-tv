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
    el: 'mx',
};


import { execSync } from 'node:child_process';
import * as dotenv from 'dotenv';
import gm from 'got';

dotenv.config();
const token = process.env.PROXY_TOKEN;
const user = token.substring(0, token.length / 2);
const pass = token.substring(token.length / 2);
const got = gm.extend(gotCfg);

try{
    const proxyData = await got('https://serverlist.piaservers.net/proxy');
    const proxyJson = JSON.parse(proxyData.body);
    for(let tvr of tvRegion){
        const cc = proxyCode[tvr] ? proxyCode[tvr] : tvr;
        const px = proxyJson.find(i => {
            return i.iso.toLowerCase() == cc;
        });
        if(!px){
            console.log('\n=== PTV Updater ===\n');
            console.log('[warn] no proxy for %s region', cc);
            continue;
        }
        const proxyHost = px.dns;
        execSync(`node app.js --proxy "https://${user}:${pass}@${proxyHost}/" --cc ${tvr}`, { stdio: 'inherit' });
    }
}
catch(e){
    console.log('[error] update failed!');
    console.log(e);
}
