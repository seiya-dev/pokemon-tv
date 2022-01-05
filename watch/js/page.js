let tvData = {};
let cats = [];

let tvRegion = '';
let channel  = '';
let video_id = '';

const pl_id = 'playerContainer';
let player;

// set loader and get button
document.addEventListener('DOMContentLoaded', async () => {
    yall({ "observeChanges": true });
    await loadMain();
});

function uriLoader(){
    uri = new URL(location);
    uri = uri.hash.replace(/^#/, '');
    uri = new URL(uri, 'https://watch.pokemon.com');
    
    const regDefType = '(channel|video|)?$';
    const regUri = new RegExp(`^\/(${Object.keys(tvRegions).join('|')})/${regDefType}`);
    const uriData = uri.pathname.match(regUri);
    
    if(!uriData){
        window.location.hash = '#/us/';
        return uriLoader();
    }
    
    return { uri, regUri, uriData };
}

async function loadMain(cc){
    if(cc && `/${cc}/`.match(uriLoader()['regUri'])){
        window.location.hash = `#/${cc}/`;
    }
    
    const uriData = uriLoader()['uriData'];
    
    tvRegion = uriData[1];
    const regionLoaded = await loadRegion();
    
    if(uriData[2] == 'video' && uriLoader()['uri'].searchParams.get('id')){
        for(let c of tvData.channels){
            let selVideo = c.media.filter(v => v.id ==  uriLoader()['uri'].searchParams.get('id') && c.category_id != 2);
            if(selVideo.length > 0){
                channel  = c.channel_id;
                video_id = uriLoader()['uri'].searchParams.get('id')
            }
        }
    }
    else if(uriData[2] == 'channel' && uriLoader()['uri'].searchParams.get('id')){
        let selChan = tvData.channels.filter(c => c.channel_id == uriLoader()['uri'].searchParams.get('id'));
        if(selChan.length > 0){
            channel = uriLoader()['uri'].searchParams.get('id');
        }
    }
    
    if(regionLoaded){
        loadData();
        if(channel != ''){
            await showChannel();
        }
        if(video_id != ''){
            await showVideoBox();
        }
    }
    
    for(let o of Object.keys(tvRegions)){
        if(o == 'us'){
            continue;
        }
        const modeOpt = addEl({type: 'option', value: o, text: tvRegions[o]});
        selEl('#region').appendChild(modeOpt);
    }
    
    selEl('#selRegion .button').addEventListener('click', async () => {
        tvRegion = selEl('#region').value;
        channel = '';
        window.location.hash = `#/${tvRegion}/`;
        uriLoader();
        const lr = await loadRegion();
        if(lr){
            await loadData();
        }
    }, false);
}

async function loadRegion(){
    if(document.getElementById('load')){
        document.getElementById('load').remove();
    }
    
    selEl('#pages').append('<button id="load">Loading...</button>');
    
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
        document.getElementById('load').remove();
        return true;
    }
    catch(e){
        document.getElementById('load').remove();
        selEl('#pages').append('<button id="load">Can\'t fetch TV data!</button>');
        console.log(e);
        return false;
    }
}

function loadData(){
    cleanup('pages');
    cats = [];
    
    if(!tvData.data){
        return;
    }
    
    for(let s of tvData.data){
        if(cats.indexOf(s.category) < 0){
            cats.push(s.category);
        }
    }
    
    for(let c of cats){
        const pgbtn = addEl({type: 'button', class: [], text: c});
        pgbtn.addEventListener('click',()=>{ channel = ''; video_id = ''; loadCat(c); }, false);
        selEl('#pages').appendChild(pgbtn);
    }
    
    loadCat(cats[0]);
}

function loadCat(cat){
    
    cleanup('bodyContent');
    
    if(channel == '' && video_id == ''){
        window.location.hash = `#/${tvRegion}/`;
        uriLoader();
    }
    
    if(channel != '' && video_id == ''){
        window.location.hash = `#/${tvRegion}/channel?id=${channel}`;
        uriLoader();
    }
    
    const catScreen = addEl({
        type: 'div',
        class: ['c-category-screen'],
    });
    
    const row = addEl({
        id: 'posters',
        type: 'div',
        class: ['row'],
    });
    
    const h1 = addEl({
        id: 'catTitle',
        type: 'h1',
        class: ['col-12'],
        text: cat,
    });
    
    row.appendChild(h1);
    catScreen.appendChild(row);
    selEl('#bodyContent').appendChild(catScreen);
    
    for(const s of tvData.data){
        if(s.category == cat){
            
            const prevImg   = addEl({
                type: 'img',
                title: s.channel_name,
                alt: s.channel_id,
                class: ['lazy'],
                src: imgBase64.poster,
                dataset: { src: s.channel_image },
            });
            
            const contCellLink = addEl({
                type: 'span',
            });
            
            const contCell = addEl({
                type: 'div',
                class: ['channel-tile', 'col-6', 'col-md-4', 'col-xl-3'],
            });
            
            contCellLink.addEventListener('click', () => {
                channel = s.channel_id;
                showChannel();
            }, false);
            
            contCellLink.appendChild(prevImg);
            contCell.appendChild(contCellLink);
            selEl('#posters').appendChild(contCell);
            
        }
    }
}

async function showChannel(){
    const curCannel = tvData.channels.filter(s => s.channel_id == channel);
    
    if(curCannel.length < 1){
        return;
    }
    
    cleanup('bodyContent');
    
    window.location.hash = `#/${tvRegion}/channel?id=` + channel;
    uriLoader();
    
    const hSection  = addEl({
        type: 'section',
        class: ['c-season-hero', 'col-12'],
    });
    
    const hContainer = addEl({
        type: 'div',
        class: ['hero-container', 'col-5'],
    });
    
    let chanImg2 = curCannel[0].channel_images.spotlight_image_2048_1152;
    let chanImg1 = curCannel[0].channel_images.spotlight_image_1660_940;
    
    
    let chanImg = chanImg2 && chanImg2 != '' ? chanImg2 : '';
    chanImg = chanImg1 && chanImg1 != '' ? chanImg1 : chanImg;
    chanImg = chanImg != '' ? chanImg : 'img/channel.png';
    
    
    const hImg = addEl({
        type: 'img',
        class: ['hero-background', 'lazy'],
        src: imgBase64.channel,
        dataset: { src: chanImg },
    });
    
    hContainer.appendChild(hImg);
    hSection.appendChild(hContainer);
    
    const sInfoWrap = addEl({
        type: 'div',
        class: ['season-info-wrapper', 'col-lg-7'],
    });
    
    const sInfoWrap2 = addEl({
        type: 'div',
        class: ['bottom-season-info', 'row', 'col-12'],
    });
    
    if(curCannel[0].category_id == 1){
        const sTVInfoWrap = addEl({
            type: 'div',
            class: ['row', 'align-items-end'],
        });
        const sTVInfoSn = addEl({
            type: 'h3',
            class: ['d-inline', 'pr-2'],
            text: `Season ${curCannel[0].order / -1000}`,
        });
        const sTVInfoEn = addEl({
            type: 'h6',
            class: ['d-inline'],
            text: `${curCannel[0].media.length} Episodes`,
        });
        
        sTVInfoWrap.appendChild(sTVInfoSn);
        sTVInfoWrap.appendChild(sTVInfoEn);
        sInfoWrap2.appendChild(sTVInfoWrap);
    }
    
    const sInfoSnWrap = addEl({
        type: 'div',
        class: ['row'],
    });
    
    const sInfoSn = addEl({
        type: 'h2',
        text: curCannel[0].channel_name,
    });
    
    const sInfoSdWrap = addEl({
        type: 'div',
        class: ['row', 'season-description'],
    });
    
    const sInfoSd = addEl({
        type: 'h5',
        text: curCannel[0].channel_description,
        class: ['p-0', 'col-12'],
    });
    
    sInfoSnWrap.appendChild(sInfoSn);
    sInfoWrap2.appendChild(sInfoSnWrap);
    
    sInfoSdWrap.appendChild(sInfoSd);
    sInfoWrap2.appendChild(sInfoSdWrap);
    
    sInfoWrap.appendChild(sInfoWrap2);
    hSection.appendChild(sInfoWrap);
    
    selEl('#bodyContent').appendChild(hSection);
    
    const vSection = addEl({
        type: 'section',
        class: ['c-episode-carousel', 'c-season-episodes'],
    });
    
    const vContainer = addEl({
        type: 'div',
        class: ['row', 'episode-card'],
    });
    
    for(let v of curCannel[0].media){
        
        const vCont = addEl({
            type: 'div',
            class: ['episode-thumbnail', 'col-12'],
        });
        
        const pCont = addEl({
            type: 'div',
            class: ['episode-img-cover', 'col-12', 'col-md-4', 'col-lg-3'],
        });
        
        const pTile = addEl({
            type: 'div',
            class: ['episode-tile'],
        });
        
        pTile.addEventListener('click', () => {
            video_id = v.id;
            showVideoBox();
        }, false);
        
        const pImg = addEl({
            type: 'img',
            class: ['lazy'],
            src: imgBase64.episode,
            dataset: { src: v.images.medium },
        });
        
        pTile.appendChild(pImg)
        pCont.appendChild(pTile);
        vCont.appendChild(pCont);
        
        const tCont = addEl({
            type: 'div',
            class: ['tile-episode-info', 'col-12', 'col-md-8', 'col-lg-9'],
        });
        
        if(v.episode != ''){
            const epNum = addEl({
                type: 'p',
                class: ['tile-episode-number'],
                text: `Episode ${v.episode}`,
            });
            tCont.appendChild(epNum);
        }
        
        const epTitle = addEl({
            type: 'h4',
            text: v.title,
        });
        
        const epDesc = addEl({
            type: 'p',
            class: ['episode-description-p', 'col-12', 'col-md-7'],
            text: v.description,
        });
        
        tCont.appendChild(epTitle);
        tCont.appendChild(epDesc);
        vCont.appendChild(tCont);
        
        const hr = addEl({
            type: 'hr',
            class: ['tile-episode-divider'],
        });
        
        vCont.appendChild(hr);
        vContainer.appendChild(vCont);
        
    }
    
    vSection.appendChild(vContainer);
    selEl('#bodyContent').appendChild(vSection);
    
}

async function showVideoBox(){
    const curCannel = tvData.channels.filter(s => s.channel_id == channel);
    
    if(curCannel.length < 1){
        return;
    }
    
    const curVideo = curCannel[0].media.filter(v => v.id == video_id);
    
    if(curVideo.length < 1){
        return;
    }
    
    window.location.hash = `#/${tvRegion}/video?id=` + video_id;
    uriLoader();
    
    cleanup('photobox');
    const v = curVideo[0];
    
    selEl('body').style.overflow = 'hidden';
    selEl('#photobox').style.display = 'block';
    
    let title = '';
    if(v.season != '' && v.episode != ''){
        title += `S${v.season.padStart(2, '0')}E${v.episode.padStart(2, '0')} - `;
    }
    title += v.title;
    
    let videoData, errMsg;
    
    try{
        videoData = await getJson(`${videoPathReq}/${video_id}/getPlaylistByMediaId`);
    }
    catch(e){
        errMsg  = 'Can\'t fetch video! ';
        errMsg += e.message;
    }
    
    if(videoData){
        let streams = videoData.playlistItems[0].streams, bitrate = 0, url = '';
        let poster = v.images.large;
        
        for(let s in streams){
            if(bitrate < streams[s].videoBitRate){
                bitrate = streams[s].videoBitRate;
                url = rtmp2dl(streams[s].url);
            }
        }
        
        selEl('#photobox').appendChild(genVideoTag(url, poster));
        player = videojs('#' + pl_id, {
            controlBar: {
                volumePanel: { inline: false },
            },
        });
        selEl('#' + pl_id).appendChild(generateHeaderBar(title));
        player.mobileUi();
    }
    if(errMsg){
        selEl('#photobg').style.display = 'block';
        selEl('#photobg').addEventListener('click', () => { hideVideoBox(true) }, false);
        const videoErrEl1 = addEl({
            type: 'span',
            text: errMsg,
        });
        const videoErrEl2 = addEl({
            type: 'br',
        });
        const videoErrEl3 = addEl({
            type: 'span',
            text: 'Tip: Try another region.',
        });
        const videoErrElCont  = addEl({
            type: 'div',
        });
        videoErrElCont.appendChild(videoErrEl1);
        videoErrElCont.appendChild(videoErrEl2);
        videoErrElCont.appendChild(videoErrEl3);
        const videoErrDiv = document.createElement('div');
        videoErrDiv.id = 'video-error';
        videoErrDiv.appendChild(videoErrElCont);
        selEl('#photobox').appendChild(videoErrDiv);
    }
}

function generateHeaderBar(title){
    const videoTitleEl  = addEl({
        type: 'span',
        class: [ 'header-description', ],
        text: title,
    });
    
    const closeEl = document.createElement('span');
    closeEl.classList.add('header-back-button');
    closeEl.addEventListener('click', () => { hideVideoBox(false); }, false);
    
    const mainTitleElSmall = document.createElement('div');
    mainTitleElSmall.classList.add('header-bar-small');
    mainTitleElSmall.appendChild(closeEl);
    mainTitleElSmall.appendChild(videoTitleEl);
    
    const mainTitleEl = document.createElement('div');
    mainTitleEl.classList.add('vjs-header-bar');
    mainTitleEl.appendChild(mainTitleElSmall);
    
    return mainTitleEl;
}

function hideVideoBox(isBg){
    if(isBg){
        selEl('#photobg').removeEventListener('click', hideVideoBox, false);
    }
    
    if(player && player.player_){
        
        player.dispose();
    }
    
    selEl('#photobox').style.display = 'none';
    selEl('#photobg').style.display = 'none';
    selEl('body').style.overflow = 'auto';
    
    window.location.hash = `#/${tvRegion}/channel?id=` + channel;
    uriLoader();
}

function genVideoTag(video, poster){
    const videoEl     = document.createElement('video');
    videoEl.id        = pl_id;
    videoEl.className = 'video-js';
    videoEl.preload   = 'metadata';
    videoEl.controls  = 'controls';
    videoEl.dataset = {};
    if(poster){
        videoEl.dataset.setup = `{ "poster": "${poster}" }`
    }
    const sourceEl    = document.createElement('source');
    sourceEl.src      = video;
    sourceEl.type     = 'video/mp4';
    videoEl.appendChild(sourceEl);
    return videoEl;
}
