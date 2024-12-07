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

app.get('/', (req, res) => {
    res.redirect('/yt/');
});

const tv_regions = {
    'us': { name: 'United States',  ip: '3.3.3.3',      },
    'uk': { name: 'UK',             ip: '86.5.53.25',   },
    'fr': { name: 'France',         ip: '2.2.2.2',      },
    'it': { name: 'Italia',         ip: '2.32.0.1',     },
    'de': { name: 'Deutschland',    ip: '2.160.0.1',    },
    'es': { name: 'España',         ip: '2.152.0.1',    },
    'el': { name: 'América Latina', ip: '8.14.224.1',   },
    'br': { name: 'Brasil',         ip: '179.93.224.1', },
    'ru': { name: 'Россия',         ip: '5.104.32.1',   },
    'dk': { name: 'Danmark',        ip: '2.128.0.1',    },
    'nl': { name: 'Nederland',      ip: '24.132.0.1',   },
    'fi': { name: 'Suomi',          ip: '37.130.160.1', },
    'no': { name: 'Norge',          ip: '92.221.54.1',  },
    'se': { name: 'Sverige',        ip: '46.195.212.1', },
    'yt': { name: 'YouTube',        ip: '1.1.1.1',      },
};

const regionList = Object.keys(tv_regions);
app.get('/:region(' + regionList.join('|') + ')/:type(channel|video)?', (req, res) => {
    // 
    // set template
    let templatePage = fs.readFileSync(path.join(watchDir, 'template.html'), 'utf8');
    templatePage = templatePage.replace('<!-- put_tv_region -->', `<script>const tvRegion = '${req.params.region}';</script>`);
    templatePage = templatePage.replace('<!-- put_tv_data -->', `<script src="/data/${req.params.region}.js"></script>`);
    // set regions selector
    const region_otions = [];
    for(const r_cc of regionList){
        const r_selected = r_cc == req.params.region ? ' selected' : '';
        region_otions.push(`<option value="${r_cc}"${r_selected}>${tv_regions[r_cc].name}</option>`);
    }
    templatePage = templatePage.replace('<!-- put_regions -->', region_otions.join('\n' + ' '.repeat(20)));
    // send page
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(templatePage);
});

// get tvdata js
app.get('/data/:region(' + regionList.join('|') + ').js', (req, res) => {
    const tvChannelData = fs.readFileSync(path.join(watchDir, 'data', req.params.region + '.json'), 'utf8');
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.end('const tvData = ' + tvChannelData.trim() + ';');
});

// set llnwD domain
const llnwDomainRegex = /^https:\/\/(s2\.content\.video\.llnw\.net|s2\.cpl\.delvenetworks\.com)\//;

/*
app.get('/m3u8/', async (req, res) => {
   if(req.query.url && req.query.url.match(domainRegex) && req.query.url.match(/\.m3u8$/)){
        try{
            const vHead = await got(req.query.url);
            if(vHead.statusCode == 200){
                const rhost = new URL(req.query.url).origin
                const vPath = new URL(req.query.url).pathname.split('/').slice(0, -1).join('/');
                res.setHeader('Content-Type', 'audio/x-mpegurl');
                vHead.body = vHead.body.replace(/^\//gm, `${req.headers.referer}m3u8/?url=${rhost}/`);
                if(vHead.body.match(/URI="vtt/)){
                    vHead.body = vHead.body.replace(/URI="vtt/gm, `URI="${req.headers.referer}vtt${rhost}${vPath}/vtt`);
                }
                if(vHead.body.match(/\.ts$/m)){
                    vHead.body = vHead.body.replace(/^playlist/gm, `${req.headers.referer}ts/?url=${rhost}${vPath}/playlist`);
                }
                res.end(vHead.body);
            }
            else{
                res.status(vHead.statusCode);
                res.end('');
            }
        }
        catch(error){
            res.status(404);
            res.end('');
        }
        return;
   }
   res.end('');
});
app.get('/ts/', async (req, res) => {
    if(req.query.url && req.query.url.match(llnwDomainRegex)){
        const stream = got.stream(req.query.url)
        stream.on('error', error => {
            res.status(404);
            res.end('');
        })
        stream.pipe(res);
    }
});
*/

// set proxy for vtt from llnw
app.get('/vtt/', async (req, res) => {
   if(req.query.url && req.query.url.match(llnwDomainRegex) && req.query.url.match(/\.vtt$/)){
        try{
            const vHead = await got(req.query.url, {
                throwHttpErrors: false,
            });
            if(vHead.statusCode == 200){
                res.setHeader('Content-Type', 'text/vtt');
                res.end(vHead.body);
            }
            else{
                res.status(vHead.statusCode);
                res.end('');
            }
        }
        catch(error){
            res.status(404);
            res.end('');
        }
        return;
    }
    res.end('');
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
