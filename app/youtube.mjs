import ytpl from '@distube/ytpl';
import ytdl from '@distube/ytdl-core';

const series = {
    s01: 'https://www.youtube.com/playlist?list=PLRcHmntfmJ8CnSmj4C284-a1euH518aQa',
    s02: 'https://www.youtube.com/playlist?list=PLRcHmntfmJ8AtnKq7EHNIQBUNTs85bqwS',
    s03: 'https://www.youtube.com/playlist?list=PLRcHmntfmJ8DB8wgMrUZwf3JGkLM17yeL',
};

const pl = await ytpl(series.s02);

for(const v of pl.items){
    const vj = {};
    const vd = (await ytdl.getBasicInfo(v.id)).player_response.videoDetails;
    
    vd.title = vd.title.replace(' l ', ' | ');
    
    if(!vd.title.match(/FULL EPISODE/i)){
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
    vj.embed_url = `https://www.youtube.com/embed/${vd.videoId}`;
    
    console.log('        ' + JSON.stringify(vj, null, '    ').replace(/\n/g, '\n        ') + ',');
    
    // break;
}
