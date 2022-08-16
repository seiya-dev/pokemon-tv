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
            let selVideo = c.media.filter(v => v.id == uriLoader()['uri'].searchParams.get('id') && c.category_id != 2);
            if(selVideo.length > 0){
                channel  = c.channel_id;
                video_id = uriLoader()['uri'].searchParams.get('id');
            }
        }
        if(video_id == '' && uriLoader()['uri'].searchParams.get('id').match(/^[-0-9a-f]{32}$/)){
            video_id = uriLoader()['uri'].searchParams.get('id');
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
        pgbtn.addEventListener('click',() => { channel = ''; video_id = ''; loadCat(c); }, false);
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

function showChannel(){
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
        
        pTile.addEventListener('click', async () => {
            video_id = v.id;
            await showVideoBox();
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
            let vSeasonNum = '';
            if(v.season != '' && channel.match(/^stunts-/)){
                vSeasonNum = `Season ${v.season} • `;
            }
            const epNum = addEl({
                type: 'p',
                class: ['tile-episode-number'],
                text: `${vSeasonNum}Episode ${v.episode}`,
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

function generateVideoHeader(videoTitle){
    const videoTitleEl  = addEl({
        type: 'span',
        class: [ 'header-description' ],
        text: videoTitle,
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
    
    selEl('#' + pl_id).appendChild(mainTitleEl);
}

function makeControlButton(type = '', new_video_id = ''){
    const curCannel = tvData.channels.filter(s => s.channel_id == channel);
    if(curCannel.length < 1){
        return;
    }
    const curVideo = curCannel[0].media.filter(v => v.id == new_video_id);
    if(curVideo.length < 1){
        return;
    }
    
    const buttonCfg = {};
    if(type == 'previous'){
        buttonCfg.class = 'vjs-backward';
        buttonCfg.text = 'Previous';
    }
    else if(type == 'next'){
        buttonCfg.class = 'vjs-forward';
        buttonCfg.text = 'Next';
    }
    else{
        console.warn('[Warn] Wrong button type!');
        return;
    }
    
    const controlButton = document.createElement('button');
    controlButton.type = 'button';
    controlButton.classList.add('vjs-play-control', 'vjs-control', 'vjs-button', buttonCfg.class);
    controlButton.title = buttonCfg.text;
    
    const controlButtonSpan1 = document.createElement('span');
    controlButtonSpan1.classList.add('vjs-icon-placeholder');
    controlButton.appendChild(controlButtonSpan1);
    const controlButtonSpan2 = document.createElement('span');
    controlButtonSpan2.classList.add('vjs-control-text');
    controlButtonSpan2.innerText = buttonCfg.text;
    controlButton.appendChild(controlButtonSpan2);
    
    controlButton.addEventListener('click', async () => {
        video_id = new_video_id;
        if(player && player.player_){
            player.dispose();
        }
        await showVideoBox();
    }, false);
    selEl(`#${pl_id} .vjs-control-bar`).prepend(controlButton);
}

function hideVideoBox(isHideBgEvent){
    if(isHideBgEvent){
        selEl('#photobg').removeEventListener('click', hideVideoBox, false);
    }
    
    if(player && player.player_){
        player.dispose();
    }
    
    selEl('#photobox').style.display = 'none';
    selEl('#photobg').style.display = 'none';
    selEl('body').style.overflow = 'auto';
    
    window.location.hash = `#/${tvRegion}/` + (channel != '' ? 'channel?id=' + channel : '');
    uriLoader();
}

function genVideoEl(videoUrl, posterUrl, captionsUrl){
    const videoEl     = document.createElement('video');
    videoEl.id        = pl_id;
    videoEl.className = 'video-js';
    videoEl.preload   = 'metadata';
    videoEl.controls  = 'controls';
    videoEl.dataset = {};
    if(posterUrl){
        videoEl.dataset.setup = `{ "poster": "${posterUrl}" }`
    }
    const sourceEl = document.createElement('source');
    sourceEl.src = videoUrl;
    if(sourceEl.src.match(/\.mp4$/i)){
        sourceEl.type = 'video/mp4';
    }
    if(sourceEl.src.match(/\.m3u8$/i)){
        sourceEl.type = 'application/x-mpegURL';
    }
    if(sourceEl.src.match(/^data:application\/vnd.videojs.vhs\+json/)){
        sourceEl.type = 'application/vnd.videojs.vhs+json';
    }
    videoEl.appendChild(sourceEl);
    if(captionsUrl){
        const trackEl = document.createElement('track');
        // trackEl.default = 'default';
        trackEl.kind = 'captions';
        trackEl.src = captionsUrl;
        trackEl.label = 'CC';
        videoEl.appendChild(trackEl);
    }
    selEl('#photobox').appendChild(videoEl);
}

async function showVideoBox(){
    if(player && player.player_){
        player.dispose();
    }
    
    cleanup('photobox');
    selEl('body').style.overflow = 'hidden';
    selEl('#photobox').style.display = 'block';
    
    let curCannel = tvData.channels.filter(s => s.channel_id == channel);
    curCannel = curCannel.length > 0 ? curCannel[0] : { media: [] };
    let curVideo = curCannel.media.filter(v => v.id == video_id);
    curVideo = curVideo.length > 0 ? curVideo[0] : {};
    
    const v = curVideo;
    const channelVideoCount = curCannel.media.length;
    const videoIndex = curCannel.media.indexOf(v);
    
    v.stream_url_root = '';
    if(typeof v.stream_url != 'string'){
        v.stream_url = '';
    }
    
    if(!v.images || Object.prototype.toString.call(v.images) != '[object Object]'){
        v.images = {};
    }
    
    showLoadingVideoBox();
    
    let checkVideoId = false;
    let videoData = {}, videoDataMobile = {};
    let vData = {}, checkMaster = {}, videoUrl = '', vBitrate = 0;
    
    if(typeof video_id == 'string' && video_id.match(/^[-0-9a-f]{32}$/)){
        checkVideoId = true;
    }
    
    if(v.stream_url != '' && v.stream_url.match(/-[-0-9a-f]{40}.m3u8$/)){
        const masterUrl = v.stream_url.replace(/-[-0-9a-f]{40}.m3u8$/, '.mp4');
        checkMaster = await getHeaders(corsProxy  + '/?' + masterUrl);
        checkMaster.checked = true;
        if(checkMaster.ok){
            videoUrl = masterUrl;
            console.log('master url:', videoUrl)
        }
    }
    
    if(checkVideoId && videoUrl == ''){
        if(!checkMaster.checked){
            videoDataMobile = await requestVideoId('mobile video');
            if(videoDataMobile.ok){
                const m3u8url = videoDataMobile.data.mediaList[0].mobileUrls[0].mobileUrl;
                const masterUrlVdm = m3u8url.replace(/-[-0-9a-f]{40}.m3u8$/, '.mp4');
                checkMaster = await getHeaders(corsProxy  + '/?' + masterUrlVdm);
                if(checkMaster.ok){
                    videoUrl = masterUrlVdm;
                    console.log('master url:', masterUrlVdm)
                }
            }
        }
        if(videoUrl == ''){
            videoData = await requestVideoId();
        }
    }
    else{
        videoData = { ok: false, is_404: true, data: 'Video ID incorrect' };
    }
    
    if(!videoData.ok && v.stream_url == ''){
        let errVideo = [videoData.data];
        if(videoData.is_404){
            errVideo.push('Code: Video Not Found');
        }
        else{
            errVideo.push('Tip: Try another region');
        }
        showErrorVideoBox(errVideo);
        return;
    }
    
    window.location.hash = `#/${tvRegion}/video?id=` + video_id;
    uriLoader();
    
    if(videoData.ok){
        vData =  videoData.data
        const streams = vData.playlistItems[0].streams;
        for(let s in streams){
            if(vBitrate < streams[s].videoBitRate){
                vBitrate = streams[s].videoBitRate;
                videoUrl = rtmp2dl(streams[s].url);
            }
        }
    }
    
    const m3u8data = { use: false };
    if(videoUrl == '' && v.stream_url != ''){
        /*
        videoUrl = v.stream_url;
        if(v.stream_url.match(/\.m3u8$/)){
            try{
                m3u8data.use = true;
                m3u8data.root = '';
                m3u8data.origin = new URL(v.stream_url).origin;
                const videoStreamData = await getJson(corsProxy  + '/?' + videoUrl);
                videoStreamData.playlists.sort((a, b) => {
                    const brA = a.attributes.BANDWIDTH;
                    const brB = b.attributes.BANDWIDTH;
                    if(brA < brB){
                        return 1;
                    }
                    if(brA > brB){
                        return -1;
                    }
                    return 0;
                })
                videoStreamData.playlists = [ videoStreamData.playlists[0] ];
                videoStreamData.playlists[0].uri = corsProxy + '/?' + m3u8data.origin + videoStreamData.playlists[0].uri;
                videoUrl = `data:application/vnd.videojs.vhs+json,${JSON.stringify(videoStreamData)}`;
            }
            catch(e){
                showErrorVideoBox(['Video not found!']);
                return;
            }
        }
        */
    }
    
    if(videoUrl == ''){
        showErrorVideoBox(['Video not found!']);
        return;
    }
    
    let videoTitle = '';
    if(v.season && v.episode && v.season != '' && v.episode != ''){
        videoTitle += `S${v.season.padStart(2, '0')}E${v.episode.padStart(2, '0')} - `;
    }
    if(v.title){
        videoTitle += v.title;
    }
    if(videoTitle == '' && vData.title){
        videoTitle = vData.title;
    }
    if(videoTitle == ''){
        videoTitle = 'PLAYING...';
    }
    
    let posterUrl = '';
    if(typeof vData.imageUrl == 'string' && vData.imageUrl != ''){
        posterUrl = vData.imageUrl.replace('http://', 'https://');
    }
    if(typeof v.images.large == 'string' && v.images.large != ''){
        posterUrl = v.images.large;
    }
    
    let captionsUrl;
    if(typeof v.captions == 'string' && v.captions != ''){
        captionsUrl = corsProxy + '/?' + v.captions;
    }
    else if(checkVideoId && typeof v.captions != 'string' || checkVideoId && v.captions == ''){
        const reqCC = await requestVideoId('closed captions');
        if(reqCC.ok && reqCC.data.length > 0){
            captionsUrl = corsProxy + '/?' + reqCC.data[0].webvttFileUrl.replace('http://', 'https://');
        }
    }
    
    videojs.Vhs.xhr.beforeRequest = function (options) {
        if(m3u8data.use && v.stream_url != ''){
            if(options.uri.match(/\.m3u8$/)){
                m3u8data.root = options.uri.split('/').slice(0, -1).join('/');
            }
            const file = new URL(options.uri).pathname;
            if(file.match(/^\/playlist\d+\.ts$/)){
                options.uri = m3u8data.root + file;
            }
        }
        return options;
    };
    
    cleanup('photobox');
    genVideoEl(videoUrl, posterUrl, captionsUrl);
    player = videojs('#' + pl_id, {
        preload: 'auto',
        html5: {
            vhs: {
                overrideNative: true,
            },
            nativeAudioTracks: false,
            nativeVideoTracks: false,
        },
        controlBar: {
            controls: true,
            volumePanel: {
                inline: false ,
            },
            children: [
                'playToggle',
                'volumeMenuButton',
                'progressControl',
                'volumePanel',
                'subsCapsButton',
                'qualitySelector',
                'fullscreenToggle',
            ],
        },
    });
    
    generateVideoHeader(videoTitle);
    
    let new_video_id;
    if(videoIndex > 0){
        new_video_id = curCannel.media[videoIndex - 1].id;
        makeControlButton('previous', new_video_id);
    }
    if(videoIndex < channelVideoCount - 1){
        new_video_id = curCannel.media[videoIndex + 1].id;
        makeControlButton('next', new_video_id);
    }
    
    player.mobileUi();
    player.hotkeys({
        volumeStep: 0.1,
        seekStep: 5,
        enableModifiersForNumbers: false,
        alwaysCaptureHotkeys: true,
    });
}

function showLoadingVideoBox(){
    const videoLoadingCont = addEl({ type: 'div' });
    const videoLoadingTxt = addEl({ type: 'span', text: 'Loading...', });
    videoLoadingCont.appendChild(videoLoadingTxt);
    const videoLoadingDiv = addEl({ type: 'div', id: 'video-loading' });
    videoLoadingDiv.appendChild(videoLoadingCont);
    selEl('#photobox').appendChild(videoLoadingDiv);
}

async function requestVideoId(type = '', corsId = 0){
    const corsHeaders = [
        {},
    ];
    
    if(corsProxyIP[tvRegion]){
        corsHeaders.push(generateProxyHeader(tvRegion));
    }
    
    let reqMethod;
    switch(type) {
        case 'video':
            reqMethod = 'getPlaylistByMediaId';
            break;
        case 'mobile video':
            reqMethod = 'getMobilePlaylistByMediaId?platform=HttpLiveStreaming&';
            break;
        case 'closed captions':
            reqMethod = 'getClosedCaptionsDetailsByMediaId';
            break;
        default:
            reqMethod = 'getPlaylistByMediaId';
    } 
    
    try{
        const corsProxyUri = corsId > 0 ? corsProxy + '/?' : '';
        const videoData = await getJson(`${corsProxyUri}${videoPathReq}/${video_id}/${reqMethod}`, corsHeaders[corsId]);
        return { ok: true, is_404: false, data: videoData };
    }
    catch(e){
        corsId++;
        if(corsId  < corsHeaders.length && e.message != 'Error: Not Found!'){
            return await requestVideoId(type, corsId);
        }
        else{
            const is_404 = e.message == 'Error: Not Found!' ? true : false;
            return { ok: false, is_404: is_404, data: `Can\'t fetch ${type}! ${e.message}` };
        }
    }
}

function generateProxyHeader(cc){
    return {
        'x-cors-headers': JSON.stringify({
            'X-Forwarded-For': corsProxyIP[cc],
            'Origin': 'https://watch.pokemon.com',
        }),
    }
}

function showErrorVideoBox(errArr){
    cleanup('photobox');
    selEl('#photobg').style.display = 'block';
    selEl('#photobg').addEventListener('click', () => { hideVideoBox(true) }, false);
    const videoErrCont = addEl({ type: 'div' });
    
    for(let errIdx in errArr){
        const errTxt = errArr[errIdx];
        const videoErr = addEl({
            type: 'span',
            text: errTxt,
        });
        videoErrCont.appendChild(videoErr);
        if(errArr > errIdx+1){
            const videoErrSep = addEl({ type: 'br' });
            videoErrCont.appendChild(videoErrSep);
        }
    }
    
    const videoErrDiv = addEl({ type: 'div', id: 'video-error' });
    videoErrDiv.appendChild(videoErrCont);
    selEl('#photobox').appendChild(videoErrDiv);
}
