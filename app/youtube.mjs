import ytpl from '@distube/ytpl';
import ytdl from '@distube/ytdl-core';
import fs from 'node:fs';
import path from 'path';

// config
const type_str = 'series';
const selected = 'season03';
const cat_id = 1.1;
const cat_name = 'series';
const sort_order = -3000;

// consts
const playLists = {
    season01: 'PLRcHmntfmJ8CnSmj4C284-a1euH518aQa',
    season02: 'PLRcHmntfmJ8AtnKq7EHNIQBUNTs85bqwS',
    season03: 'PLRcHmntfmJ8DB8wgMrUZwf3JGkLM17yeL',
};

const dashborders = {
    season01: 'https://qu.ax/fptgq.jpg',
    season02: 'https://qu.ax/bRQrA.jpg',
    season03: 'https://qu.ax/Zvdsq.jpg',
}

// parser
const pl = await ytpl(playLists[selected], {limit: Infinity});

const tvDump = {};
tvDump.id = selected;
tvDump.title = pl.title.replace(/\(Season \d+\)$/i, '').trim();
tvDump.description = pl.description || '';
tvDump.images = { 
    dashboard: dashborders[selected],
    spotlight: `https://i.ytimg.com/vi/${pl.items[0].id}/maxresdefault.jpg`,
};
tvDump.category_id = cat_id;
tvDump.category = cat_name;
tvDump.order = sort_order;
tvDump.media = [];

for(const v of pl.items){
    const vj = {};
    const vdFull = await ytdl.getBasicInfo(v.id);
    const vd = vdFull.player_response.videoDetails;
    
    vd.title = vd.title.replace(' l ', ' | ');
    
    if(!vd.title.match(/FULL EPISODE/i)){
        console.log('Video Skipped:', vd.title);
        continue;
    }
    
    const snnum = vd.title.split('|')[2].match(/\d+/)[0];
    const epnum = vd.title.split('|')[1].match(/\d+/)[0];
    
    vj.id = `s${ snnum.padStart(2, '0') }e${ epnum.padStart(2, '0') }`;
    vj.season = snnum;
    vj.episode = epnum;
    vj.title = vd.title.split('|')[0].trim();
    vj.description = vd.shortDescription.split('\n\n')[0];
    vj.images = {
        large: `https://i.ytimg.com/vi/${vd.videoId}/maxresdefault.jpg`,
        medium: `https://i.ytimg.com/vi/${vd.videoId}/hqdefault.jpg`
    };
    vj.poketv_url = '';
    vj.embed_url = `https://www.youtube.com/embed/${vd.videoId}`;
    
    console.log(`GOT ${vj.id}`);
    tvDump.media.push(vj);
}

// save
const __dirname = path.resolve();
const dbFile = path.join(__dirname, '/database/yt/', `${type_str}-${selected}.json`);
fs.writeFileSync(dbFile, JSON.stringify(tvDump, null, 4) + '\n', 'utf8');
