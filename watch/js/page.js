// set get button
document.addEventListener('DOMContentLoaded', async () => {
    uri = new URL(location);
    for(let o of Object.keys(tvRegions)){
        const modeOpt = addEl({type: 'option', value: o, text: tvRegions[o]});
        selEl('#region').appendChild(modeOpt);
        if(uri.searchParams.get('cc') == o){
            selEl('#region').value = o;
            tvRegion = o;
        }
    }
    if(tvRegion != ''){
        await loadRegion();
        if(uri.searchParams.get('video')){
            for(let c of tvData.channels){
                let selVideo = c.media.filter(v => v.id == uri.searchParams.get('video') && c.category_id != 2);
                if(selVideo.length > 0){
                    channel  = c.channel_id;
                    video_id = uri.searchParams.get('video');
                }
            }
            if(video_id != ''){
                showChannel();
                await showPhotoBox();
            }
        }
        else if(uri.searchParams.get('channel')){
            let selChan = tvData.channels.filter(c => c.channel_id == uri.searchParams.get('channel'));
            if(selChan.length > 0){
                channel  = uri.searchParams.get('channel');
            }
            if(channel != ''){
                showChannel();
            }
        }
    }
    selEl('#selRegion .button').addEventListener('click', async () => {
        await loadRegion();
    }, false);
});

let uri = {};
let tvData = {};
let cats = [];

let tvRegion = '';
let channel  = '';
let video_id = '';

const pl_id = 'limelight_player';
let player;

async function loadRegion(){
    cleanup('load');
    
    selEl('#load').classList.add('padtop5');
    selEl('#load').append('<span>Loading...</span>');
    
    tvRegion = selEl('#region').value;
    
    try{
        const tvChannels = await getJson('data/' + tvRegion + '.json');
        tvData.channels = tvChannels;
        tvData.data = tvChannels.map(data => {
            return {
                channel_id: data.channel_id,
                channel_name: data.channel_name,
                channel_description: data.channel_description,
                channel_image: data.channel_images.dashboard_image_1125_1500,
                category_id: data.category_id,
                category: data.category,
                order: data.order,
            }
        });
        cleanup('load');
        selEl('#load').classList.remove('padtop5');
        loadData();
    }
    catch(e){
        cleanup('load');
        selEl('#load').classList.add('padtop5');
        selEl('#load').append('<span>Cant fetch tv data!</span>');
        console.log('Cant fetch tv data!');
        console.log(e);
    }
}

function loadData(){
    cleanup('pages');
    cats = [];
    
    for(let s of tvData.data){
        if(cats.indexOf(s.category) < 0){
            cats.push(s.category);
        }
    }
    
    for(let c of cats){
        const pgbtn = addEl({type: 'span', class: ['button'], text: c});
        pgbtn.addEventListener('click',()=>{ loadCat(c); }, false);
        selEl('#pages').appendChild(pgbtn);
        selEl('#pages').append('<span> </span>');
    }
    loadCat(cats[0]);
}


function loadCat(cat){
    cleanup('videos');
    for(let s of tvData.data){
        if(s.category == cat){
            const prevImg   = addEl({
                type: 'img',
                alt: s.channel_id,
                src: s.channel_image,
            });
            const contCell = addEl({
                type: 'div',
                class: ['cell','cellPoster'],
            });
            contCell.addEventListener('click', () => {
                channel = s.channel_id;
                showChannel();
            }, false);
            contCell.appendChild(prevImg);
            const contTable = addEl({
                type: 'div',
                class: ['table'],
            });
            const infoCell  = addEl({ type: 'div', class: ['info_cell', 'info_cellPoster'] });
            infoCell.appendChild(addEl({ type: 'span', text: s.channel_name }));
            contTable.appendChild(infoCell);
            contTable.appendChild(contCell);
            const contdiv = addEl({
                type: 'div',
                id: s.channel_id,
                class: ['photo']
            });
            contdiv.appendChild(contTable);
            selEl('#videos').appendChild(contdiv);
        }
    }
}

async function showChannel(){
    const curCannel = tvData.channels.filter(s => s.channel_id == channel);
    
    if(curCannel.length < 1){
        return;
    }
    
    cleanup('videos');
    
    for(let v of curCannel[0].media){
        const prevImg   = addEl({
            type: 'img',
            alt: v.id,
            src: v.images.large,
        });
        const contCell = addEl({
            type: 'div',
            class: ['cell'],
        });
        contCell.addEventListener('click', () => {
            video_id = v.id;
            showPhotoBox();
        }, false);
        contCell.appendChild(prevImg);
        const contTable = addEl({
            type: 'div',
            class: ['table'],
        });
        const infoCell  = addEl({ type: 'div', class: ['info_cell'] });
        let title = '';
        if(v.season != '' && v.episode != ''){
            title += `S${v.season}E${v.episode} - `;
        }
        title += v.title;
        infoCell.appendChild(addEl({ type: 'span', text: title }));
        contTable.appendChild(infoCell);
        contTable.appendChild(contCell);
        const contdiv = addEl({
            type: 'div',
            id: v.id,
            class: ['photo']
        });
        contdiv.appendChild(contTable);
        selEl('#videos').appendChild(contdiv);
    }
    
}

async function showPhotoBox(){
    const curCannel = tvData.channels.filter(s => s.channel_id == channel);
    
    if(curCannel.length < 1){
        return;
    }
    
    const curVideo = curCannel[0].media.filter(v => v.id == video_id);
    
    if(curVideo.length < 1){
        return;
    }
    
    cleanup('photobox');
    const v = curVideo[0];
    
    selEl('body').style.overflow = 'hidden';
    selEl('#photobg').style.display = 'block';
    selEl('#photobox').style.display = 'block';
    selEl('#photobg').addEventListener('click', hidePhotoBox, false);
    
    let videoData;
    
    try{
        videoData = await getJson(`${videoPathReq}/${video_id}/getPlaylistByMediaId`);
    }
    catch(e){
        console.log('Cant fetch video!');
        console.log(e);
        return;
    }
    
    let streams = videoData.playlistItems[0].streams, bitrate = 0, url = '';
    
    for(let s in streams){
        if(bitrate < streams[s].videoBitRate){
            bitrate = streams[s].videoBitRate;
            url = rtmp2dl(streams[s].url);
        }
    }
    
    let title = '';
    if(v.season != '' && v.episode != ''){
        title += `S${v.season}E${v.episode} - `;
    }
    title += v.title;
    
    const videoTitleEl  = addEl({
        type: curCannel[0].category_id != 2 ? 'a' : 'span',
        href: `?cc=${tvRegion}&video=${video_id}`,
        text: title,
    });
    
    const mainTitleEl = document.createElement('div');
    mainTitleEl.appendChild(videoTitleEl);
    
    selEl('#photobox').appendChild(mainTitleEl);
    selEl('#photobox').appendChild(genVideoTag(url));
    player = videojs('#' + pl_id);
}

function hidePhotoBox(){
    if(player && player.player_){
        player.dispose();
    }
    selEl('#photobg').removeEventListener('click', hidePhotoBox, false);
    selEl('#photobox').style.display = 'none';
    selEl('#photobg').style.display = 'none';
    selEl('body').style.overflow = 'auto';
}

function genVideoTag(video){
    const mainEl      = document.createElement('div');
    const videoEl     = document.createElement('video');
    videoEl.id        = pl_id;
    videoEl.className = 'video-js';
    videoEl.preload   = 'metadata';
    videoEl.controls  = 'controls';
    const sourceEl    = document.createElement('source');
    sourceEl.src      = video;
    sourceEl.type     = video.match(/\.m3u8$/) ? 'application/x-mpegURL' : 'video/mp4';
    videoEl.appendChild(sourceEl);
    mainEl.appendChild(videoEl);
    return mainEl;
}

function u2s(url){
    return url.replace(/^http:/,'https:');
}

function rtmp2dl(url){
    let rtmpLimelightDomain = url.split(':')[1].split('/')[2];
    let httpLimelightDomain = limelightDomains[rtmpLimelightDomain] ?
            limelightDomains[rtmpLimelightDomain] : rtmpLimelightDomain.replace(/\.csl\./,'.cpl.');
    let path   = url.split(':')[2];
    return `https://${httpLimelightDomain}/${path}`;
}

const limelightDomains = {
    's2.csl.delvenetworks.com': 's2.cpl.delvenetworks.com',
    's2.csl.video.llnw.net':    's2.content.video.llnw.net',
};
