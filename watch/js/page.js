let tvData = {};
let cats = [];

let tvRegion = '';
let channel  = '';
let video_id = '';

const pl_id = 'playerContainer';
let player;

// set loader and get button
document.addEventListener('DOMContentLoaded', async () => {
    yall({ 'observeChanges': true });
    await loadMain();
});

function uriLoader(){
    let uri = new URL(location);
    uri = uri.hash.replace(/^#/, '');
    uri = new URL(uri, 'https://watch.pokemon.com');
    
    const regDefType = '(channel|video|)?$';
    const regUri = new RegExp(`^/(${Object.keys(tvRegions).join('|')})/${regDefType}`);
    const uriData = uri.pathname.match(regUri);
    
    if(!uriData){
        window.location.hash = '#/us/';
        return uriLoader();
    }
    
    return { uri, regUri, uriData };
}

async function loadMain(){
    for(let o of Object.keys(tvRegions)){
        if(o == 'us'){
            continue;
        }
        const regionOpt = `<option value="${o}">${tvRegions[o].name}</option>`;
        appendHTML('#region', regionOpt);
    }
    
    qSel('#region').addEventListener('change', async () => {
        tvRegion = qSel('#region').value;
        channel = '';
        window.location.hash = `#/${tvRegion}/`;
        uriLoader();
        removeChildEls('body-content');
        const regionLoaded = await loadRegion();
        if(regionLoaded){
            await loadData();
        }
    }, false);
    
    const uriData = uriLoader()['uriData'];
    qSel('#region').value = uriData[1];
    tvRegion = uriData[1];
    
    const regionLoaded = await loadRegion();
    
    if(uriData[2] == 'video' && uriLoader()['uri'].searchParams.get('id')){
        for(let c of tvData.channels){
            let selVideo1 = c.media.filter(v => v.id == uriLoader()['uri'].searchParams.get('id') && c.category_id != 2);
            let selVideo2 = c.media.filter(v => v.id == uriLoader()['uri'].searchParams.get('id') && c.category_id == 2);
            if(selVideo1.length > 0){
                channel  = c.channel_id;
                video_id = uriLoader()['uri'].searchParams.get('id');
            }
            else if(selVideo2.length > 0 && channel == ''){
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
            showChannel();
        }
    }
    
    if(video_id != ''){
        await showPlayerBox();
    }
}

async function loadRegion(){
    if(qSel('#load')){
        qSel('#load').remove();
    }
    
    removeChildEls('nav-buttons');
    appendHTML('#nav-buttons', '<button id="load">Loading...</button>');
    const tvChannels = await doReq('./data/' + tvRegion + '.json');
    
    if(!tvChannels.ok || !tvChannels.json){
        tvData.channels = [ { media: [] } ];
        qSel('#load').remove();
        appendHTML('#nav-buttons', '<button id="load">Can\'t fetch TV data!</button>');
        console.log(tvChannels);
        return false;
    }
    
    tvData.channels = tvChannels.json;
    tvData.data = tvChannels.json.map(data => {
        return {
            channel_id: data.channel_id,
            channel_name: data.channel_name,
            channel_description: data.channel_description,
            channel_image: data.channel_images.dashboard_image_1125_1500,
            category_id: data.category_id,
            category: data.category,
            order: data.order,
        };
    });
    
    qSel('#load').remove();
    return true;
}

function loadData(){
    removeChildEls('nav-buttons');
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
        const navbtn = createEl('button', {text: tlText(c)});
        navbtn.addEventListener('click',() => { channel = ''; video_id = ''; loadCat(c); }, false);
        qSel('#nav-buttons').appendChild(navbtn);
    }
    
    loadCat(cats[0]);
}

function tlText(type){
    if(tlData[tvRegion] && tlData[tvRegion][type] && typeof tlData[tvRegion][type] == 'string' && tlData[tvRegion][type] != ''){
        return tlData[tvRegion][type];
    }
    return type;
}

function loadCat(cat){
    removeChildEls('body-content');
    
    if(channel == '' && video_id == ''){
        window.location.hash = `#/${tvRegion}/`;
        uriLoader();
    }
    
    if(channel != '' && video_id == ''){
        window.location.hash = `#/${tvRegion}/channel?id=${channel}`;
        uriLoader();
    }
    
    const catScreen = createEl('div', {
        type: 'div',
        class: ['c-category-screen'],
        child: [
            createEl('div', {
                id: 'posters',
                class: ['row'],
                child: [
                    createEl('h1', {
                        id: 'catTitle',
                        class: ['col-12',],
                        innerText: tlText(cat),
                    }),
                ],
            }),
        ],
    });
    
    qSel('#body-content').appendChild(catScreen);
    
    for(const s of tvData.data){
        if(s.category == cat){
            const contCell = createEl('span', {
                class: ['channel-tile', 'col-6', 'col-md-4', 'col-xl-3'],
                child: [
                    createEl('span', {
                        event: { 
                            type: 'click',
                            func: () => {
                                channel = s.channel_id;
                                showChannel();
                            },
                        },
                        child: [
                            createEl('img', {
                                title: s.channel_name,
                                alt: s.channel_id,
                                class: ['lazy'],
                                src: imgBase64.poster,
                                dataset: { src: s.channel_image },
                            }),
                        ]
                    }),
                ],
            });
            qSel('#posters').appendChild(contCell);
        }
    }
}

function showChannel(){
    let curChannel = tvData.channels.filter(s => s.channel_id == channel);
    
    if(curChannel.length < 1){
        return;
    }
    
    curChannel = curChannel[0];
    removeChildEls('body-content');
    
    window.location.hash = `#/${tvRegion}/channel?id=` + channel;
    uriLoader();
    
    let chanImg2 = curChannel.channel_images.spotlight_image_2048_1152;
    let chanImg1 = curChannel.channel_images.spotlight_image_1660_940;
    
    let chanImg = chanImg2 && chanImg2 != '' ? chanImg2 : '';
    chanImg = chanImg1 && chanImg1 != '' ? chanImg1 : chanImg;
    chanImg = chanImg != '' ? chanImg : '../img/channel.png';
    
    let channelInfo = [];
    if(curChannel.category_id == 1){
        channelInfo.push(createEl('div', {
            class: ['row', 'align-items-end'],
            child: [
                createEl('h3', { class: ['d-inline', 'pr-2'], text: `${tlText('Season')} ${curChannel.order / -1000}` }),
                createEl('h6', { class: ['d-inline'],         text: `${tlText('Episodes')} ${curChannel.media.length}` }),
            ],
        }));
    }
    
    channelInfo.push(createEl('div', {
        class: ['row'],
        child: [
            createEl('h2', { text: curChannel.channel_name }),
        ],
    }));
    
    if(curChannel.channel_description != ''){
        channelInfo.push(createEl('div', {
            class: ['row', 'season-description'],
            child: [
                createEl('h5', {
                    class: ['p-0', 'col-12'],
                    text: curChannel.channel_description,
                }),
            ],
        }));
    }
    
    const hSection  = createEl('section', {
        class: ['c-season-hero', 'col-12'],
        child: [
            createEl('div', {
                class: ['hero-container', 'col-5'],
                child: [
                    createEl('img', {
                        class: ['hero-background', 'lazy'],
                        src: imgBase64.channel,
                        dataset: { src: chanImg },
                    }),
                ],
            }),
            createEl('div', {
                class: ['season-info-wrapper', 'col-lg-7'],
                child: [
                    createEl('div', {
                        class: ['bottom-season-info', 'row', 'col-12'],
                        child: channelInfo,
                    }),
                ],
            }),
        ],
    });
    
    qSel('#body-content').appendChild(hSection);
    
    const vSection = createEl('section', {
        class: ['c-season-episodes'],
        child: [
            createEl('div', {
                class: ['row', 'episode-card'],
            }),
        ],
    });
    
    for(let vi in curChannel.media){
        const v = curChannel.media[vi];
        
        if(vi < 1){
            vSection.children[0].append(createEl('hr', {
                class: ['tile-episode-divider-first', 'tile-episode-divider'],
            }));
        }
        
        let epNumEl = { notEl: true };
        if(v.episode != ''){
            let vSeasonNum = '';
            if(v.season != '' && curChannel.category_id == 2){
                vSeasonNum = `${tlText('Season')} ${v.season} • `;
            }
            epNumEl = createEl('p', {
                class: ['tile-episode-number'],
                text: `${vSeasonNum}${tlText('Episode')} ${v.episode}`,
            });
        }
        
        const epEl = createEl('div', {
            class: ['episode-thumbnail', 'col-12'],
            child: [
                createEl('div', {
                    class: ['episode-img-cover', 'col-12', 'col-md-4', 'col-lg-3'],
                    child: [
                        createEl('div', {
                            class: ['episode-tile'],
                            event: { 
                                type: 'click',
                                func: async () => {
                                    video_id = v.id;
                                    await showPlayerBox();
                                },
                            },
                            child: [
                                createEl('img', {
                                    type: 'img',
                                    class: ['lazy'],
                                    src: imgBase64.episode,
                                    dataset: { src: v.images.medium },
                                }),
                            ],
                        }),
                    ],
                }),
                createEl('div', {
                    class: ['tile-episode-info', 'col-12', 'col-md-8', 'col-lg-9'],
                    child: [
                        epNumEl,
                        createEl('h4', {
                            text: v.title,
                        }),
                        createEl('p', {
                            class: ['episode-description-p'],
                            text: v.description,
                        }),
                    ],
                }),
                createEl('hr', {
                    class: ['tile-episode-divider'],
                }),
            ],
        });
        
        vSection.children[0].append(epEl);
    }
    
    qSel('#body-content').appendChild(vSection);
}

async function showPlayerBox(){
    if(player && player.player_){
        player.dispose();
    }
    
    removeChildEls('player-box');
    qSel('body').style.overflow = 'hidden';
    qSel('#player-box').style.display = 'block';
    
    let curChannel = tvData.channels.filter(s => s.channel_id == channel);
    curChannel = curChannel.length > 0 ? curChannel[0] : { media: [] };
    let curVideo = curChannel.media.filter(v => v.id == video_id);
    curVideo = curVideo.length > 0 ? curVideo[0] : {};
    
    const v = curVideo;
    const channelVideoCount = curChannel.media.length;
    const videoIndex = curChannel.media.indexOf(v);
    const m3u8data = { use: false };
    
    v.stream_url_root = '';
    if(typeof v.stream_url != 'string'){
        v.stream_url = '';
    }
    
    if(!v.images || Object.prototype.toString.call(v.images) != '[object Object]'){
        v.images = {};
    }
    
    showLoadingPlayerBox();
    
    let checkVideoId = false;
    let videoData = {}, videoDataMobile = {};
    let vData = {}, checkMaster = {}, videoUrl = '', vBitrate = 0;
    
    if(typeof video_id == 'string' && video_id.match(/^[-0-9a-f]{32}$/)){
        checkVideoId = true;
    }
    
    if(v.stream_url != '' && v.stream_url.match(/-[-0-9a-f]{40}.m3u8$/)){
        const masterUrl = v.stream_url.replace(/-[-0-9a-f]{40}.m3u8$/, '.mp4');
        checkMaster = await doReq(corsProxy  + '/?' + masterUrl, {method: 'HEAD'});
        checkMaster.checked = true;
        if(checkMaster.ok){
            videoUrl = masterUrl;
            console.log('master url:', masterUrl);
        }
    }
    
    if(checkVideoId && videoUrl == ''){
        if(!checkMaster.checked){
            videoDataMobile = await requestVideoId('mobile video');
            if(videoDataMobile.ok && videoDataMobile.json){
                const m3u8url = videoDataMobile.json.mediaList[0].mobileUrls[0].mobileUrl;
                const masterUrlVdm = u2s(m3u8url.replace(/-[-0-9a-f]{40}.m3u8$/, '.mp4'));
                checkMaster = await doReq(corsProxy  + '/?' + masterUrlVdm, {method: 'HEAD'});
                if(checkMaster.ok){
                    vData = {
                        title: videoDataMobile.json.mediaList[0].title,
                        imageUrl: videoDataMobile.json.mediaList[0].previewImageUrl,
                    };
                    videoUrl = masterUrlVdm;
                    console.log('master url:', masterUrlVdm);
                }
            }
        }
        if(videoUrl == ''){
            videoData = await requestVideoId();
            if(videoData.ok && videoData.json){
                vData = videoData.json;
                const streams = vData.playlistItems[0].streams;
                for(let s in streams){
                    if(vBitrate < streams[s].videoBitRate){
                        vBitrate = streams[s].videoBitRate;
                        videoUrl = rtmp2http(streams[s].url);
                    }
                }
                console.log('stream url:', videoUrl);
            }
        }
    }
    else{
        const err = new Error('Video ID incorrect');
        videoData = { ok: false, err };
    }
    
    if(videoUrl == ''){
        let errVideo = [];
        if(videoData.json && videoData.json.detail && videoData.json.detail.detailMessage){
            errVideo.push(videoData.json.detail.detailMessage);
        }
        else{
            errVideo.push('Unknown error');
        }
        showErrorPlayerBox(errVideo);
        return;
    }
    
    window.location.hash = `#/${tvRegion}/video?id=` + video_id;
    uriLoader();
    
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
        posterUrl = u2s(vData.imageUrl);
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
        if(reqCC.ok && reqCC.json && reqCC.json.length > 0){
            captionsUrl = corsProxy + '/?' + u2s(reqCC.json[0].webvttFileUrl);
        }
    }
    
    videojs.Vhs.xhr.beforeRequest = (options) => {
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
    
    removeChildEls('player-box');
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
                inline: false,
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
    
    generatePlayerHeader(videoTitle);
    
    let new_video_id;
    if(videoIndex > 0){
        new_video_id = curChannel.media[videoIndex - 1].id;
        makeControlButton('previous', new_video_id);
    }
    if(videoIndex < channelVideoCount - 1){
        new_video_id = curChannel.media[videoIndex + 1].id;
        makeControlButton('next', new_video_id);
    }
    
    if(!m3u8data.use){
        addDownloadButton(videoUrl);
    }
    
    player.mobileUi();
    player.hotkeys({
        volumeStep: 0.1,
        seekStep: 5,
        enableModifiersForNumbers: false,
        alwaysCaptureHotkeys: true,
    });
}

function generatePlayerHeader(videoTitle){
    const videoTitleEl = createEl('div', {
        class: ['vjs-header-bar'],
        child: [
            createEl('div', {
                class: ['header-bar-small'],
                child: [
                    createEl('span', {
                        class: ['header-back-button'],
                        event: {
                            type: 'click',
                            func: () => {
                                closePlayerBox(false);
                            },
                        },
                    }),
                    createEl('span', {
                        class: ['header-description'],
                        innerText: videoTitle
                    }),
                ],
            }),
        ],
    });
    
    qSel(`#${pl_id}`).appendChild(videoTitleEl);
}

function makeControlButton(type = '', new_video_id = ''){
    const curChannel = tvData.channels.filter(s => s.channel_id == channel);
    if(curChannel.length < 1){
        return;
    }
    const curVideo = curChannel[0].media.filter(v => v.id == new_video_id);
    if(curVideo.length < 1){
        return;
    }
    
    const buttonCfg = {};
    if(type == 'previous'){
        buttonCfg.class = 'vjs-backward-control';
        buttonCfg.text = 'Previous';
    }
    else if(type == 'next'){
        buttonCfg.class = 'vjs-forward-control';
        buttonCfg.text = 'Next';
    }
    else{
        console.warn('[Warn] Wrong button type!');
        return;
    }
    
    const controlButton = createEl('button', {
        class: [buttonCfg.class, 'vjs-control', 'vjs-button'],
        title: buttonCfg.text,
        event: {
            type: 'click',
            func: async () => {
                video_id = new_video_id;
                if(player && player.player_){
                    player.dispose();
                }
                await showPlayerBox();
            },
        },
        child: [
            createEl('span', {
                class: ['vjs-icon-placeholder'],
            }),
            createEl('span', {
                class: ['vjs-control-text'],
                innerText: buttonCfg.text,
            }),
        ],
    });
    
    qSel(`#${pl_id} .vjs-control-bar`).prepend(controlButton);
}

function addDownloadButton(url){
    const downloadButtonText = 'Download';
    const downloadButton = createEl('button', {
        class: ['vjs-download-button', 'vjs-control', 'vjs-button'],
        title: downloadButtonText,
        event: {
            type: 'click',
            func: async () => {
                const dlLink = document.createElement('a');
                dlLink.setAttribute('download', '');
                dlLink.setAttribute('target', '_blank');
                dlLink.href = url;
                // document.body.appendChild(dlLink);
                dlLink.click();
                dlLink.remove();
            },
        },
        child: [
            createEl('span', {
                class: ['vjs-icon-placeholder'],
            }),
            createEl('span', {
                class: ['vjs-control-text'],
                innerText: downloadButtonText,
            }),
        ],
    });
    const beforeSelEl = qSel(`#${pl_id} .vjs-control-bar .vjs-fullscreen-control`);
    const parentEl = beforeSelEl.parentNode;
    parentEl.insertBefore(downloadButton, beforeSelEl);
}

function showLoadingPlayerBox(){
    const loadingHtml = createEl('div', {
        id: 'video-loading',
        innerHTML: `<div><span>${tlText('Loading')}...</span></div>`,
    });
    qSel('#player-box').append(loadingHtml);
}

async function requestVideoId(type = '', useCors){
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
    
    const corsProxyUri = useCors ? corsProxy + '/?' : '';
    const corsHeaders = useCors ? generateProxyHeader(tvRegion) : {};
    const videoData = await doReq(`${corsProxyUri}${videoApiReq}/${video_id}/${reqMethod}`, corsHeaders);
    
    if(!useCors && videoData && videoData.status && videoData.status == 403){
        return requestVideoId(type, true);
    }
    
    return videoData;
}

function generateProxyHeader(cc){
    cc = tvRegions[cc] ? cc : 'us';
    return {
        'x-cors-headers': JSON.stringify({
            'X-Forwarded-For': tvRegions[cc].ip,
            'Origin': 'https://watch.pokemon.com',
        }),
    };
}

function showErrorPlayerBox(errArr){
    removeChildEls('player-box');
    qSel('#player-close-button').style.display = 'block';
    qSel('#player-close-button').addEventListener('click', () => { closePlayerBox(true); }, false);
    
    let errHTML = [];
    for(let errIdx in errArr){
        errHTML.push(createEl('span', {innerText: errArr[errIdx]}));
        if(errArr.length > errIdx+1){
            errHTML.push(createEl('br'));
        }
    }
    
    const videoErrDiv = createEl('div', {
        id: 'video-error',
        child: [
            createEl('div', {
                child: errHTML
            }),
        ],
    });
    
    qSel('#player-box').appendChild(videoErrDiv);
}

function closePlayerBox(byCloseButton){
    if(byCloseButton){
        qSel('#player-close-button').removeEventListener('click', closePlayerBox, false);
    }
    
    if(player && player.player_){
        player.dispose();
    }
    
    qSel('#player-box').style.display = 'none';
    qSel('#player-close-button').style.display = 'none';
    qSel('body').style.overflow = 'auto';
    
    window.location.hash = `#/${tvRegion}/` + (channel != '' ? 'channel?id=' + channel : '');
    uriLoader();
}

function genVideoEl(videoUrl, posterUrl, captionsUrl){
    const videoElOpts = {
        id: pl_id,
        class: ['video-js'],
        preload: 'metadata',
        controls: 'controls',
        dataset: {},
    };
    
    if(posterUrl){
        videoElOpts.dataset.setup = `{ "poster": "${posterUrl}" }`;
    }
    
    const sourceEl = createEl('source');
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
    
    const videoEl = createEl('video', videoElOpts);
    videoEl.appendChild(sourceEl);
    
    if(captionsUrl){
        const trackEl = createEl('track', {
            // default: 'default',
            kind: 'captions',
            src: captionsUrl,
            label: 'CC',
        });
        videoEl.appendChild(trackEl);
    }
    
    qSel('#player-box').appendChild(videoEl);
}
