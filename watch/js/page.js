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
    
    const regDefType = '(?<page_type>channel|video|)?$';
    const regUri = new RegExp(`^/(?<region>${Object.keys(tvRegions).join('|')})/${regDefType}`);
    const uriData = uri.pathname.match(regUri);
    
    if(!uriData){
        window.location.hash = '#/us/';
        return uriLoader();
    }
    
    const pageParam = uriData.groups;
    pageParam.page_type = pageParam.page_type || '';
    pageParam.query = uri.searchParams;
    
    return pageParam;
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
    
    const uriData = uriLoader();
    qSel('#region').value = uriData.region;
    tvRegion = uriData.region;
    
    const regionLoaded = await loadRegion();
    
    if(uriData.page_type == 'channel' && uriData.query.get('id')){
        const selChannel = tvData.channels.filter(c => c.channel_id == uriData.query.get('id'));
        if(selChannel.length > 0){
            channel = selChannel[0].channel_id;
            if(selChannel.length > 1){
                console.warn(':: WARN: Exists two channels with same id!');
            }
        }
    }
    
    if(uriData.page_type == 'video' && uriData.query.get('id')){
        if(uriData.query.get('c')){
            const selChannel = tvData.channels.filter(c => c.channel_id == uriData.query.get('c'));
            if(selChannel.length > 0){
                channel = selChannel[0].channel_id;
            }
        }
        
        for(const c of tvData.channels){
            if(channel == '' || channel == c.channel_id){
                const selVideo = c.media.filter(v => v.id == uriData.query.get('id'));
                if(selVideo.length > 0){
                    channel  = c.channel_id;
                    video_id = selVideo[0].id;
                    break;
                }
            }
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
    
    let chanImg = curChannel.channel_images.spotlight_image_1660_940;
    chanImg = chanImg != '' ? chanImg : '../img/channel.png';
    
    const chMedia = curChannel.media.filter(v => {
        return v.id != '' && !v.id.match(/-deleted$/i) && ( v.stream_url != '' || v.poketv_url != '' );
    });
    
    let channelInfo = [];
    if(curChannel.category_id == 1){
        const seasonInfo = [];
        const seriesNum = curChannel.channel_id.match(/^season(?<num>\d+)$/);
        if(seriesNum && seriesNum.groups.num){
            seasonInfo.push(createEl('h3', { class: ['d-inline', 'pr-2'], text: `${tlText('Season')} ${parseInt(seriesNum.groups.num)}` }));
        }
        seasonInfo.push(createEl('h6', { class: ['d-inline'], text: `${tlText('Episodes')} ${chMedia.length}` }));
        channelInfo.push(createEl('div', {
            class: ['row', 'align-items-end'],
            child: seasonInfo,
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
    
    for(let vi in chMedia){
        const v = chMedia[vi];
        
        if(vi < 1){
            vSection.children[0].append(createEl('hr', {
                class: ['tile-episode-divider-first', 'tile-episode-divider'],
            }));
        }
        
        let detetedTxt = (v.id.match(/-deleted$/i)?' [DELETED]':'');
        let epNumEl = { notEl: true };
        
        if(v.episode != '' || detetedTxt != ''){
            let vSeasonNum = '';
            let vEpisodeNum = '';
            if(v.season != '' && curChannel.category_id == 2){
                vSeasonNum = `${tlText('Season')} ${v.season} • `;
            }
            if(v.episode != ''){
                vEpisodeNum = `${tlText('Episode')} ${v.episode}`;
            }
            epNumEl = createEl('p', {
                class: ['tile-episode-number'],
                text: (`${vSeasonNum}${vEpisodeNum}${detetedTxt}`).trim(),
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
    
    let videoUrl = '';
    let videoTitle = '';
    let captionsUrl = '';
    let posterUrl = '';
    
    let isEmbed = false;
    let isDLAvailable = false;
    showLoadingPlayerBox();
    
    if(typeof v.poketv_url == 'string' && v.poketv_url != ''){
        videoUrl = v.poketv_url;
        console.log('poketv url:', v.poketv_url);
        isDLAvailable = true;
    }
    
    if(videoUrl == '' && typeof v.stream_url == 'string' && v.stream_url.match(/#EMBED$/i)){
        videoUrl = v.stream_url.replace(/#EMBED$/i, '');
        if(v.stream_url.match(/^https:\/\/www\.terabox\.com\//)){
            videoUrl += '&resolution=1080&autoplay=false';
        }
        console.log('embed url:', videoUrl);
        isDLAvailable = false;
        isEmbed = true;
    }
    
    if(videoUrl == '' && typeof v.stream_url == 'string' && v.stream_url.match(/#.m3u8$/i)){
        videoUrl = v.stream_url;
        console.log('stream url:', videoUrl);
        isDLAvailable = false;
    }
    
    // set url
    if(videoIndex > -1){
        const curChannelId = channel != '' ? `c=${channel}&` : '';
        window.location.hash = `#/${tvRegion}/video?${curChannelId}id=${video_id}`;
        uriLoader();
    }
    
    // set error
    if(videoUrl == ''){
        const errVideo = [];
        if(typeof video_id == 'string' && video_id.match(/-deleted$/i)){
            errVideo.push('DELETED', 'Media was deleted.');
        }
        else{
            errVideo.push('NOT FOUND', 'Media not found.');
        }
        showErrorPlayerBox(errVideo);
        return;
    }
    
    // set title
    if(v.season && v.episode && v.season != '' && v.episode != ''){
        videoTitle += `S${v.season.padStart(2, '0')}E${v.episode.padStart(2, '0')} - `;
    }
    if(v.title){
        videoTitle += v.title;
    }
    if(videoTitle == ''){
        videoTitle = 'PLAYING...';
    }
    
    // set poster
    if(typeof v.images.large == 'string' && v.images.large != ''){
        posterUrl = v.images.large;
    }
    
    // set caption url
    if(typeof v.captions == 'string' && v.captions != ''){
        captionsUrl = '/vtt/?url=' + encodeURIComponent(v.captions);
    }
    
    removeChildEls('player-box');
    genPlayer(videoUrl, posterUrl, captionsUrl, isEmbed);
    genPlayerHeader(videoTitle, isEmbed);
    
    if(isDLAvailable){
        addDownloadButton(videoUrl);
    }
    
    if(isEmbed){
        createEmbedControlBar();
    }
    
    let new_video_id;
    if(videoIndex > 0){
        new_video_id = curChannel.media[videoIndex - 1].id;
        makeControlButton('previous', new_video_id, isEmbed);
    }
    if(videoIndex < channelVideoCount - 1){
        new_video_id = curChannel.media[videoIndex + 1].id;
        makeControlButton('next', new_video_id, isEmbed);
    }
}

function genPlayerHeader(videoTitle = '', isEmbed = false){
    const headerClass = ['vjs-header-bar'];
    
    const videoTitleEl = createEl('div', {
        class: headerClass,
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
    });
    
    document.title = document.title.split(' - ')[0];
    document.title += ' - ' + videoTitle;
    
    if(!isEmbed && player.player_){
        qSel('#'+pl_id).appendChild(videoTitleEl);
        return;
    }
    
    qSel('#player-box').appendChild(videoTitleEl);
}

function createEmbedControlBar(){
    const embedContolBar = createEl('div', {
        class: ['vjs-control-bar','vjs-embed'],
        dir: 'ltr',
    });
    
    qSel('#player-box').appendChild(embedContolBar);
}

function makeControlButton(type = '', new_video_id = '', isEmbed = false){
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
        console.warn(':: Warn: Wrong button type!');
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
    
    qSel('#player-box .vjs-control-bar').prepend(controlButton);
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
    try{
        const beforeSelEl = qSel('#player-box .vjs-control-bar .vjs-fullscreen-control');
        const parentEl = beforeSelEl.parentNode;
        parentEl.insertBefore(downloadButton, beforeSelEl);
    }
    catch(error){
        console.error(':: Failed to create download button:', error);
    }
}

function showLoadingPlayerBox(){
    const loadingHtml = createEl('div', {
        id: 'video-loading',
        innerHTML: `<div><span>${tlText('Loading')}...</span></div>`,
    });
    qSel('#player-box').append(loadingHtml);
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
    if(qSel('#embed')){
        qSel('#embed').remove();
    }
    
    if(byCloseButton){
        qSel('#player-close-button').removeEventListener('click', closePlayerBox, false);
    }
    
    if(player && player.player_){
        player.dispose();
    }
    
    qSel('#player-box').style.display = 'none';
    qSel('#player-close-button').style.display = 'none';
    qSel('body').style.overflow = 'auto';
    document.title = document.title.split(' - ')[0];
    
    window.location.hash = `#/${tvRegion}/` + (channel != '' ? 'channel?id=' + channel : '');
    uriLoader();
}

function genPlayer(videoUrl, posterUrl, captionsUrl, isEmbed = false){
    if(isEmbed){
        const embedOpts = {
            id: 'embed',
            src: videoUrl,
            scrolling: 'no',
            allowfullscreen: '',
        };
        const iframeEl = createEl('iframe', embedOpts);
        qSel('#player-box').appendChild(iframeEl);
        return;
    }
    
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
    if(sourceEl.src.match(/\.mp4(\?.*)?$/i)){
        sourceEl.type = 'video/mp4';
    }
    if(sourceEl.src.match(/\.m3u8(\?.*)?$/i)){
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
    initVideoJSPlayer();
}

function initVideoJSPlayer(){
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
    
    player.mobileUi();
    player.hotkeys({
        volumeStep: 0.1,
        seekStep: 5,
        enableModifiersForNumbers: false,
        alwaysCaptureHotkeys: true,
    });
}
