// modules
import os from 'os';
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
const watchDir = path.join(__dirname, '..', 'watch');
app.use(express.static(watchDir));

// set domain
const domainRegex = /^https:\/\/(s2\.content\.video\.llnw\.net|s2\.cpl\.delvenetworks\.com)\//;

// api
app.get('/h/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if(req.query.url && req.query.url.match(domainRegex)){
        try{
            const vHead = await got.head(req.query.url, {
                throwHttpErrors: false,
            });
            if(vHead.statusCode == 200){
                res.end(JSON.stringify({ ok: true, }));
            }
            else{
                res.status(vHead.statusCode);
                res.end(JSON.stringify({ 
                    ok: false,
                    error: 'status code: ' + vHead.statusCode,
                }));
            }
        }
        catch(error){
            res.status(404);
            res.end(JSON.stringify({
                ok: false,
                error: 'failed to get headers',
                // error_data: error,
            }));
        }
        return;
    }
    res.end(JSON.stringify({
        ok: false,
        error: 'bad request',
    }));
});

app.get('/vtt/', async (req, res) => {
   if(req.query.url && req.query.url.match(domainRegex) && req.query.url.match(/\.vtt$/)){
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

app.get('/m3u8/', async (req, res) => {
   if(req.query.url && req.query.url.match(domainRegex) && req.query.url.match(/\.m3u8$/)){
        try{
            const vHead = await got(req.query.url, {
                throwHttpErrors: false,
            });
            if(vHead.statusCode == 200){
                const rhost = new URL(req.query.url).origin
                const vPath = new URL(req.query.url).pathname.split('/').slice(0, -1).join('/');
                res.setHeader('Content-Type', 'audio/x-mpegurl');
                vHead.body = vHead.body.replace(/^\//gm, rhost + '/');
                if(vHead.body.match(/URI="vtt/)){
                    vHead.body = vHead.body.replace(/URI="vtt/gm, 'URI="' + rhost + vPath + '/vtt');
                }
                if(vHead.body.match(/\.ts$/m)){
                    vHead.body = vHead.body.replace(/^playlist/gm, rhost + vPath + '/playlist');
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

app.get('/v/', async (req, res) => {
    /*
    res.setHeader('Content-Type', 'application/json');
    if(
        req.query.uid && req.query.uid.match(/^[1-9][0-9]{1,30}?$/i) &&
        req.query.sid && req.query.sid.match(/^[1-9][0-9]{1,30}?$/i) &&
        req.query.fid && req.query.fid.match(/^[1-9][0-9]{1,30}?$/i)
    ){
        try{
            const reqfm = new URL('https://www.terabox.com/share/extstreaming.m3u8');
            reqfm.search = new URLSearchParams({
                app_id: 250528,
                channel: 'dubox',
                clienttype: 0,
                uk: req.query.uid,
                shareid: req.query.sid,
                type: 'M3U8_AUTO_720',
                fid: req.query.fid,
                sign: crypto.randomBytes(20).toString('hex'),
                timestamp: +new Date(),
            });
            
            const vData = await got(reqfm, {
                throwHttpErrors: false,
            });
            
            if(vData.statusCode == 200){
                const pl = vData.body.split('\n').map(v => {
                    if(v.match(/^http/)){
                        return 'https://apis.forn.fun/tera/proxy.php?url=' + encodeURIComponent(v);
                    }
                    return v;
                });
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.end(pl.join('\n'));
            }
            else{
                res.status(vData.statusCode);
                res.end(JSON.stringify({
                    ok: false,
                    error: 'status code: ' + vData.statusCode,
                }));
            }
        }
        catch(error){
            // console.log(error);
            res.status(404);
            res.end(JSON.stringify({
                ok: false,
                error: 'failed to fetch url',
                error_data: error,
            }));
        }
        return;
    }
    */
    if(
        req.query.surl && req.query.surl.match(/^[0-9a-z-_]{10,30}$/i)
    ){
        try{
            const proxyUrl = 'https://wholly-api.skinnyrunner.com/get/website-data.php?get_html=';
            const shortUrlApi = new URL('https://www.terabox.com/api/shorturlinfo');
            shortUrlApi.search = new URLSearchParams({
                app_id: 250528,
                channel: 'dubox',
                clienttype: 0,
                root: 1,
                shorturl: 1 + req.query.surl,
            });
            const reqfm = proxyUrl + encodeURIComponent(shortUrlApi.href);
            const vData = await got(reqfm, {
                throwHttpErrors: false,
            });
            if(vData.statusCode == 200){
                const vBody = JSON.parse(vData.body);
                if(vBody.errno == 0){
                    let file_id = 0;
                    if(vBody.list.length > 0){
                        file_id = vBody.list[0].fs_id;
                    }                    
                    const reqpl = new URL('https://www.terabox.com/share/extstreaming.m3u8');
                    reqpl.search = new URLSearchParams({
                        app_id: 250528,
                        channel: 'dubox',
                        clienttype: 0,
                        uk: vBody.uk,
                        shareid: vBody.shareid,
                        type: 'M3U8_AUTO_720',
                        fid: file_id,
                        sign: crypto.randomBytes(20).toString('hex'),
                        timestamp: +new Date(),
                    });
                    
                    const plData = await got(reqpl, {
                        throwHttpErrors: false,
                    });
                    
                    if(plData.statusCode == 200){
                        const pl = plData.body.split('\n').map(v => {
                            if(v.match(/^http/)){
                                return 'https://apis.forn.fun/tera/proxy.php?url=' + encodeURIComponent(v);
                            }
                            return v;
                        });
                        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                        res.end(pl.join('\n').replace(/#EXT-X-DISCONTINUITY\n/g,''));
                    }
                    else{
                        res.status(plData.statusCode);
                        res.end(JSON.stringify({
                            ok: false,
                            error: 'status code: ' + plData.statusCode,
                        }));
                    }
                }
                else{
                    // console.log(vData);
                    res.status(403);
                    res.end(JSON.stringify({
                        ok: false,
                        error: vBody,
                    }));
                }
            }
            else{
                res.status(vData.statusCode);
                res.end(JSON.stringify({
                    ok: false,
                    error: 'status code: ' + vData.statusCode,
                }));
            }
        }
        catch(error){
            // console.log(error);
            res.status(404);
            res.end(JSON.stringify({
                ok: false,
                error: 'failed to fetch url',
                error_data: error,
            }));
        }
        return;
    }
    console.log(req.query.surl.match(/^[0-9a-z-_]{10,30}$/i));
    res.end(JSON.stringify({
        ok: false,
        error: 'bad request',
    }));
});

function decodePackedCodes(code) {
    const mobj = code.match(/}\('(.+)',(\d+),(\d+),'([^']+)'\.split\('\|'\)/);
    let [obfuscatedCode, base, count, symbols] = mobj.slice(1);
    base = parseInt(base);
    count = parseInt(count);
    symbols = symbols.split('|');
    const symbolTable = {};
    while (count) {
        count -= 1;
        const baseNCount = encodeBaseN(count, base);
        symbolTable[baseNCount] = symbols[count] || baseNCount;
    }
    const dec = obfuscatedCode.replace(/\b(\w+)\b/g, (match) => symbolTable[match]);
    const rUrl = (/sources:\s*\[{\s*file:\s*"([^"]+)/s).exec(dec)[1];
    return rUrl;
}

function encodeBaseN(num, n, table = null) {
    const FULL_TABLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (!table) {
        table = FULL_TABLE.slice(0, n);
    }
    if (n > table.length) {
        throw new Error(`base ${n} exceeds table length ${table.length}`);
    }
    if (num === 0) {
        return table[0];
    }
    let ret = '';
    while (num) {
        ret = table[num % n] + ret;
        num = Math.floor(num / n);
    }
    return ret;
}

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
