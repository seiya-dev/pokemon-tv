// modules
import os from 'os';
import path from 'path';
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
const masterDir = path.join(__dirname, '..', 'watch');
app.use(express.static(masterDir));

// set domain
const domainRegex = /^https:\/\/(s2\.content\.video\.llnw\.net|s2\.cpl\.delvenetworks\.com)\//;

// api
app.get('/h/', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if(req.query.url && req.query.url.match(domainRegex)){
        try{
            const vHead = await got.head(req.query.url);
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
            const vHead = await got(req.query.url);
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
            const vHead = await got(req.query.url);
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
    res.setHeader('Content-Type', 'application/json');
    if(req.query.id && req.query.id.match(/^[0-9a-z]{1,15}$/)){
        try{
            const reqfm = 'https://filemoon.sx/d/'+req.query.id;
            const vData = await got(`https://api.allorigins.win/get?url=${encodeURIComponent(reqfm)}`, {
                throwHttpErrors: false,
            });
            if(vData.statusCode == 200){
                const vBody = JSON.parse(vData.body);
                const rUrl = decodePackedCodes(vBody.contents);
                res.end(JSON.stringify({ ok: true, url: rUrl }));
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
            res.status(404);
            res.end(JSON.stringify({
                ok: false,
                error: 'failed to fetch url',
                error_data: error,
            }));
        }
        return;
    }
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
