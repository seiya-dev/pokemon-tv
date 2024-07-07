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
