import { Ytdl } from '@distube/ytdl-core';
import fs from 'node:fs';
import path from 'path';

// config
const type_str   = 'series';
const selected   = 'season10';
const cat_id     = 1.1;
const cat_name   = 'series';
const sort_order = -10000;

// consts
const playLists = {
    season01: 'PLRcHmntfmJ8CnSmj4C284-a1euH518aQa',
    season02: 'PLRcHmntfmJ8AtnKq7EHNIQBUNTs85bqwS',
    season03: 'PLRcHmntfmJ8DB8wgMrUZwf3JGkLM17yeL',
    season04: 'PLRcHmntfmJ8A7vV0RYnAu0farLTV_T1i2',
    season05: 'PLRcHmntfmJ8BNWmL3MICuc1Oh5Mxf2qEh',
    season06: 'PLRcHmntfmJ8AYULKvzhleQPgPRinNDpc0',
    season07: 'PLRcHmntfmJ8BWeT4kzalbhx1r43bJv7pI',
    season08: 'PLRcHmntfmJ8BdccTC3w86qIBdUjNDfPGV',
    season09: 'PLRcHmntfmJ8DzeYoWwk7RsAbl2w-sg0zR',
    season10: 'PLJCkfNkMHldU',
};

const dashborders = {
    season01: '/img/channel/season01-1125x1500-en.jpg',
    season02: '/img/channel/season02-1125x1500-en.jpg',
    season03: '/img/channel/season03-1125x1500-en.jpg',
    season04: '/img/channel/season04-1125x1500-en.jpg',
    season05: '/img/channel/season05-1125x1500-en.jpg',
    season06: '/img/channel/season06-1125x1500-en.jpg',
    season07: '/img/channel/season07-1125x1500-en.jpg',
    season08: '/img/channel/season08-1125x1500-en.jpg',
    season09: '/img/channel/season09-1125x1500-en.jpg',
    season10: '/img/channel/season10-1125x1500-en.jpg',
}

// parser
const yt = new Ytdl();

const pl = await yt.getPlaylist(playLists[selected], {limit: 1000});

const tvDump = {};
tvDump.id = selected;
tvDump.title = pl.title.replace(/\(Season \d+\)$/i, '').trim();
tvDump.description = pl.description || '';
tvDump.images = { 
    dashboard: dashborders[selected],
    spotlight: `https://i.ytimg.com/vi/${pl.videos[0].id}/maxresdefault.jpg`,
};
tvDump.category_id = cat_id;
tvDump.category = cat_name;
tvDump.order = sort_order;
tvDump.media = [];

for(const v of pl.videos){
    const vj = {};
    
    const vdFull = await yt.getInfo(v.id);
    const vd = vdFull.videoDetails;
    
    vd.title = vd.title.replace(' l ', ' | ');
    if(!vd.title.match(/ \| POKÉMON FULL EPISODE /)){
        vd.title = vd.title.replace(' POKÉMON FULL EPISODE ', ' |  POKÉMON FULL EPISODE ');
    }
    
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
    vj.description = vd.description.split('\n\n')[0];
    vj.images = {
        large: `https://i.ytimg.com/vi/${vd.id}/maxresdefault.jpg`,
        medium: `https://i.ytimg.com/vi/${vd.id}/hqdefault.jpg`
    };
    vj.poketv_url = '';
    vj.embed_url = `https://www.youtube.com/embed/${vd.id}`;
    
    console.log(`GOT ${vj.id}`);
    tvDump.media.push(vj);
}

// save
const __dirname = path.resolve();
const dbFile = path.join(__dirname, '/database/yt/', `${type_str}-${selected}.json`);
fs.writeFileSync(dbFile, JSON.stringify(tvDump, null, 4) + '\n', 'utf8');
