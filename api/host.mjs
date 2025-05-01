// modules
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import got from 'got';

// dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// set interfaces
const ifaces = os.networkInterfaces();
const app = express();
const PORT = 11025;

// set static
const watchDir = path.join(__dirname, '..', 'web');
app.use(express.static(watchDir));

const tv_regions = {
    'us': { name: 'United States',  ip: '3.3.3.3',      },
    'uk': { name: 'UK',             ip: '86.5.53.25',   },
    'fr': { name: 'France',         ip: '2.2.2.2',      },
    'it': { name: 'Italia',         ip: '2.32.0.1',     },
    'de': { name: 'Deutschland',    ip: '2.160.0.1',    },
    'es': { name: 'España',         ip: '2.152.0.1',    },
    'el': { name: 'América Latina', ip: '8.14.224.1',   },
    'br': { name: 'Brasil',         ip: '179.93.224.1', },
    //'ru': { name: 'Россия',         ip: '5.104.32.1',   },
    'dk': { name: 'Danmark',        ip: '2.128.0.1',    },
    'nl': { name: 'Nederland',      ip: '24.132.0.1',   },
    'fi': { name: 'Suomi',          ip: '37.130.160.1', },
    'no': { name: 'Norge',          ip: '92.221.54.1',  },
    'se': { name: 'Sverige',        ip: '46.195.212.1', },
    'yt': { name: 'YouTube',        ip: '1.1.1.1',      },
};

const regionList = Object.keys(tv_regions);
const regionListStr = regionList.join('|');
const urlMain = new RegExp(`^\\/((?<region>${regionListStr})\\/)?((?<type>|channel|video)(\\?(.*))?)?$`);
const urlData = new RegExp(`^\\/data\\/(?<region>${regionListStr})\\.js(\\?(.*))?$`);

app.get(urlMain, (req, res) => {
    const reqParams = req.url.match(urlMain);
    if(!reqParams.groups.region){
        reqParams.groups.region = 'yt';
    }
    // set template
    let templatePage = fs.readFileSync(path.join(watchDir, 'template.html'), 'utf8');
    templatePage = templatePage.replace('<!-- put_tv_region -->', `<script>const tvRegion = '${reqParams.groups.region}';</script>`);
    templatePage = templatePage.replace('<!-- put_tv_data -->', `<script src="/data/${reqParams.groups.region}.js"></script>`);
    // set regions selector
    const region_otions = [];
    for(const r_cc of regionList){
        const r_selected = r_cc == reqParams.groups.region ? ' selected' : '';
        region_otions.push(`<option value="${r_cc}"${r_selected}>${tv_regions[r_cc].name}</option>`);
    }
    templatePage = templatePage.replace('<!-- put_regions -->', region_otions.join('\n' + ' '.repeat(20)));
    // send page
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(templatePage);
});
app.get(urlData, (req, res) => {
    const reqParams = req.url.match(urlData);
    const pathData = path.join(watchDir, 'data', reqParams.groups.region + '.json');
    let tvChannelData = '[]';
    if(fs.existsSync(pathData)){
        tvChannelData = fs.readFileSync(pathData, 'utf8');
    }
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.end('const tvData = ' + tvChannelData.trim() + ';');
});

// app start
app.listen(PORT, () => {
    Object.keys(ifaces).forEach((ifname) => {
        ifnames(ifaces, ifname, PORT);
    });
});

// display root
function ifnames(ifaces, ifname, port){
    ifaces[ifname].forEach(function(iface){
        if('IPv4'!==iface.family){ return; }
        console.info(`[INFO] addr: ${iface.address}:${port}`);
    });
}
