const hstate = {state:'nav'};
const htitle = document.title;
let channel_id  = '';
let video_id = '';
let player;

// set loader and get button
document.addEventListener('DOMContentLoaded', async () => {
    yall({ 'observeChanges': true });
    await loadMain();
}, false);

async function loadMain(){
    qSel('#region').addEventListener('change', function (){
        location.href = `/${this.value}/`;
    }, false);
    
    if(typeof tvData == 'undefined'){
        const navbtn = document.createElement('button');
        navbtn.innerText = 'ERROR: NO TV DATA!';
        qSel('#nav-buttons').append(navbtn);
        return;
    }
    
    history.pushState(hstate, htitle)
    const uriData = uriLoader();
    
    if(uriData.page_type == 'channel' && uriData.query.get('id')){
        const selChannel = tvData.filter(c => c.channel_id == uriData.query.get('id'));
        if(selChannel.length > 0){
            channel_id = selChannel[0].channel_id;
            if(selChannel.length > 1){
                console.warn(':: WARN: Exists two channels with same id!');
            }
        }
    }
    
    if(uriData.page_type == 'video' && uriData.query.get('id')){
        if(uriData.query.get('c')){
            const selChannel = tvData.filter(c => c.channel_id == uriData.query.get('c'));
            if(selChannel.length > 0){
                channel_id = selChannel[0].channel_id;
            }
        }
        
        for(const c of tvData){
            if(channel_id == '' || channel_id == c.channel_id){
                const selVideo = c.media.filter(v => v.id == uriData.query.get('id'));
                if(selVideo.length > 0){
                    channel_id = c.channel_id;
                    video_id = selVideo[0].id;
                    break;
                }
            }
        }
    }
    
    loadCategories();
    if(channel_id != ''){
        showChannel();
    }
    if(video_id != ''){
        await showPlayerBox();
    }
}

function loadCategories(){
    removeChildEls('#nav-buttons');
    const categories = [];
    
    for(let s of tvData){
        if(categories.indexOf(s.category) < 0){
            categories.push(s.category);
        }
    }
    
    const catNav = document.createDocumentFragment();
    
    for(let c of categories){
        const navbtn = document.createElement('button');
        navbtn.innerText = getTlText(c);
        navbtn.addEventListener('click', () => {
            channel_id = '';
            video_id = '';
            loadCategory(c);
        }, false);
        catNav.append(navbtn);
    }
    
    qSel('#nav-buttons').append(catNav);
    loadCategory(categories[0]);
}

function getTlText(type){
    try{
        const tlData = translate_data;
        const targetTl = tlData[tvRegion] || tlData['us'];
        const tlText = typeof targetTl[type] == 'string' && targetTl[type] != '' ? targetTl[type] : type;
        return tlText;
    }
    catch(e){
        console.error(':: TL Text Error:', type);
    }
    return type;
}

function loadCategory(tvCategory){
    removeChildEls('#body-content');
    
    if(channel_id == '' && video_id == ''){
        history.replaceState(hstate, htitle, `/${tvRegion}/`);
    }
    
    if(channel_id != '' && video_id == ''){
        history.replaceState(hstate, htitle, `/${tvRegion}/channel?id=${channel_id}`);
    }
    
    const catScreen = createHtmlEl(`
        <div class="c-category-screen">
            <div class="row" id="posters">
                <h1 class="col-12" id="catTitle"></h1>
            </div>
        </div>
    `);
    
    catScreen.qSel('h1').innerText = getTlText(tvCategory);
    qSel('#body-content').append(catScreen);
    
    for(const s of tvData){
        if(s.category == tvCategory){
            const poster = s.channel_images.dashboard_image_1125_1500;
            const contCell = createHtmlEl(`
                <span class="channel-tile col-6 col-md-4 col-xl-3">
                    <a>
                        <img class="lazy"/>
                    </a>
                </span>
            `);
            contCell.qSel('img').alt = s.channel_id;
            contCell.qSel('img').src = img_base64.poster;
            contCell.qSel('img').setAttribute('data-src', poster);
            contCell.qSel('a').title = s.channel_name;
            contCell.qSel('a').href = `/${tvRegion}/channel?id=${s.channel_id}`;
            contCell.qSel('a').addEventListener('click', (event) => {
                event.preventDefault();
                channel_id = s.channel_id;
                showChannel();
            }, false);
            qSel('#posters').append(contCell);
        }
    }
}

function showChannel(){
    let curChannel = tvData.filter(s => s.channel_id == channel_id);
    if(curChannel.length < 1){
        return;
    }
    
    curChannel = curChannel[0];
    removeChildEls('#body-content');
    history.replaceState(hstate, htitle, `/${tvRegion}/channel?id=${channel_id}`);
    
    let chanImg = curChannel.channel_images.spotlight_image_1660_940;
    chanImg = chanImg != '' ? chanImg : '../img/channel.png';
    const chMedia = curChannel.media.filter(v => {
        return v.id != '' && !v.id.match(/-deleted$/i) && (
            v.poketv_url != ''
            || v.stream_url != ''
            || v.embed_url != ''
            || v.terabox_surl != ''
        );
    });
    
    const channelInfo = document.createDocumentFragment();
    
    const seasonRegex = /^season(?<num>\d+)$/;
    if(curChannel.channel_id.match(seasonRegex)){
        const seasonNum = parseInt(curChannel.channel_id.match(seasonRegex).groups.num);
        const seasonInf = createHtmlEl('<h3 class="d-inline pr-2"></h3>');
        seasonInf.innerText = `${getTlText('Season')} ${seasonNum}`;
        const epsInf = createHtmlEl('<h6 class="d-inline"></h6>');
        epsInf.innerText = `${getTlText('Episodes')} ${chMedia.length}`;
        const seasonEl = createHtmlEl('<div class="row align-items-end"></div>');
        seasonEl.append(seasonInf, epsInf);
        channelInfo.append(seasonEl);
    }
    
    const chanName = createHtmlEl('<div class="row"><h2></h2></div>');
    chanName.qSel('h2').innerText = curChannel.channel_name;
    channelInfo.append(chanName);
    
    if(curChannel.channel_description != ''){
        const chanDescription = createHtmlEl('<div class="row season-description"><h5 class="p-0 col-12"></h5></div>');
        chanDescription.qSel('h5').innerText = curChannel.channel_description;
        channelInfo.append(chanDescription);
    }
    
    const chanHSection = createHtmlEl(`
        <section class="c-season-hero col-12">
            <div class="hero-container col-5">
                <img class="hero-background lazy"/>
            </div>
            <div class="season-info-wrapper col-lg-7">
                <div class="bottom-season-info row col-12">
                </div>
            </div>
        </section>
    `);
    
    chanHSection.qSel('img').src = img_base64.channel;
    chanHSection.qSel('img').setAttribute('data-src', chanImg);
    chanHSection.qSel('.bottom-season-info').append(channelInfo);
    qSel('#body-content').append(chanHSection);
    
    const vSection = createHtmlEl(`
        <section class="c-season-episodes">
            <div class="row episode-card">
                <hr class="tile-episode-divider-first tile-episode-divider"/>
            </div>
        </section>
    `);
    
    for(let vi in chMedia){
        const v = chMedia[vi];
        
        let epNumEl;
        if(v.episode != ''){
            let vSeasonNum = '';
            let vEpisodeNum = '';
            if(v.season != '' && curChannel.category == 'Stuns'){
                vSeasonNum = `${getTlText('Season')} ${v.season} • `;
            }
            if(v.episode != ''){
                vEpisodeNum = `${getTlText('Episode')} ${v.episode}`;
            }
            epNumEl = createHtmlEl(`<p class="tile-episode-number"></p>`);
            epNumEl.innerText = (`${vSeasonNum}${vEpisodeNum}`).trim();
        }
        
        const episodeEl = createHtmlEl(`
            <div class="episode-thumbnail col-12">
                <div class="episode-img-cover col-12 col-md-4 col-lg-3">
                    <div class="episode-tile">
                        <a>
                            <img class="lazy"/>
                        </a>
                    </div>
                </div>
                <div class="tile-episode-info col-12 col-md-8 col-lg-9">
                    <h4></h4>
                    <p class="episode-description-p"></p>
                </div>
                <hr class="tile-episode-divider"/>
            </div>
        `);
        
        episodeEl.qSel('img').src = img_base64.episode;
        episodeEl.qSel('img').setAttribute('data-src', v.images.medium);
        episodeEl.qSel('a').href = `/${tvRegion}/video?c=${channel_id}&id=${v.id}`;

        episodeEl.qSel('a').addEventListener('click', async (event) => {
            event.preventDefault();
            video_id = v.id;
            await showPlayerBox();
        }, false);
        
        if(epNumEl){
            episodeEl.qSel('.tile-episode-info').prepend(epNumEl);
        }
        
        episodeEl.qSel('.tile-episode-info h4').innerText = v.title;
        episodeEl.qSel('.episode-description-p').innerText = v.description;
        
        vSection.qSel('.episode-card').append(episodeEl);
    }
    
    qSel('#body-content').append(vSection);
}

async function showPlayerBox(){
    if(player?.player_){
        player.dispose();
    }
    
    removeChildEls('#player-box');
    qSel('body').style.overflow = 'hidden';
    qSel('#player-box').style.display = 'block';
    
    let curChannel = tvData.filter(s => s.channel_id == channel_id);
    curChannel = curChannel.length > 0 ? curChannel[0] : {media:[]};
    let curVideo = curChannel.media.filter(v => v.id == video_id);
    curVideo = curVideo.length > 0 ? curVideo[0] : {};
    
    const v = curVideo;
    const channelVideoCount = curChannel.media.length;
    const videoIndex = curChannel.media.indexOf(v);
    
    let videoUrl = '';
    let videoType = '';
    let captionsUrl = '';
    let videoTitle = '';
    let posterUrl = '';
    
    let dlLink = '';
    showLoadingPlayerBox();
    
    if(typeof v.poketv_url == 'string' && v.poketv_url != ''){
        videoUrl = v.poketv_url;
        videoType = 'video/mp4';
        console.log('poketv url:', v.poketv_url);
        dlLink = v.poketv_url;
    }
    
    if(videoUrl == '' && typeof v.stream_url == 'string' && v.stream_url != ''){
        videoUrl = v.stream_url;
        videoType = 'application/x-mpegURL';
        console.log('stream url:', videoUrl);
    }
    
    if(videoUrl == '' && typeof v.embed_url == 'string' && v.embed_url != ''){
        videoUrl = v.embed_url;
        videoType = 'embed';
        console.log('embed url:', videoUrl);
    }
    
    if(videoUrl == '' && typeof v.terabox_surl == 'string' && v.terabox_surl != ''){
        try{
            const tb = await getTBInfo(v.terabox_surl);
            tb.segments.map(v => {
                v.uri = tb_ts_proxy + encodeURIComponent(v.uri);
                return v;
            });
            videoType = 'application/vnd.videojs.vhs+json';
            videoUrl = `data:${videoType},${JSON.stringify(tb)}`;
        }
        catch(error){
            console.log(':: error loading terabox api:', error);
        }
        if(videoUrl == ''){
            videoUrl = 'https://www.terabox.com/sharing/embed?surl=';
            videoUrl += v.terabox_surl;
            videoUrl += '&resolution=1080&autoplay=false';
            videoType = 'embed';
            console.log('embed url:', videoUrl);
        }
    }
    
    if(videoIndex > -1){
        const curChannelId = channel_id != '' ? `c=${channel_id}&` : '';
        history.replaceState(hstate, htitle, `/${tvRegion}/video?${curChannelId}id=${video_id}`);
    }
    
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
    
    // set caption url
    if(typeof v.captions == 'string' && v.captions != ''){
        captionsUrl = '/vtt/?url=' + encodeURIComponent(v.captions);
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
    
    removeChildEls('#player-box');
    genPlayer(videoUrl, videoType, posterUrl, captionsUrl);
    genPlayerHeader(videoTitle);
    
    if(dlLink != ''){
        addDownloadButton(dlLink);
    }
    
    if(videoType == 'embed'){
        createEmbedControlBar();
    }
    
    let new_video_id;
    if(videoIndex > 0){
        new_video_id = curChannel.media[videoIndex - 1].id;
        makeControlButton('previous', new_video_id);
    }
    if(videoIndex < channelVideoCount - 1){
        new_video_id = curChannel.media[videoIndex + 1].id;
        makeControlButton('next', new_video_id);
    }

    // inert the page for better video player isolation
    const playerElem = qSel('#player-box');
    const siblings = playerElem.parentElement.children;

    for (const sib of siblings) {
        sib.inert = true;
    };
    playerElem.inert = false;

    player.on('dispose', () => {
        for (const sib of siblings) {
            sib.inert = false;
        }
    });
}

async function getTBInfo(surl){
    const reqDataUri = new URL('https://www.terabox.com/api/shorturlinfo');
    reqDataUri.search = new URLSearchParams({
        shorturl: '1' + surl,
        root: 1,
    });
    
    const reqShareData = await doReq(req_proxy + encodeURIComponent(reqDataUri));
    const shareData = reqShareData.json;
    
    if(!shareData.list || shareData.list.length < 1){
        throw new Error('no file in share url!');
    }
    
    let fid = shareData.list[0].fs_id;
    const shareLong = new URLSearchParams(shareData.longurl);
    shareLong.append('fid', fid)
    console.log(':: tbinfo:', surl, '=>', shareLong);
    return await getTBPl(shareData.uk, fid, shareData.shareid);
}

async function getTBPl(uk, fid, shareid){
    const reqPlaylistUri = new URL('https://www.terabox.com/share/extstreaming.m3u8');
    const sign = Array(...crypto.getRandomValues(new Uint32Array(5))).map(v => v.toString(16).padStart(8, '0')).join('');
    reqPlaylistUri.search = new URLSearchParams({
        app_id: 250528,
        channel: 'dubox',
        clienttype: 0,
        uk: uk,
        shareid: shareid,
        type: 'M3U8_AUTO_720',
        fid: fid,
        sign: sign,
        timestamp: +new Date(),
    });
    
    const reqPlaylistData = await doReq(req_proxy + encodeURIComponent(reqPlaylistUri));
    if(reqPlaylistData.json?.errno == 31341){
        return await getTBPl(uk, fid, shareid);
    }
    if(!reqPlaylistData.extm3u){
        console.log(':: not tb playlist:', reqPlaylistData.text);
        throw new Error('not tb playlist!..');
    }
    if(reqPlaylistData.extm3u && !reqPlaylistData.text.match(/\n#EXT-X-ENDLIST\n/g)){
        console.log(':: tb playlist:', reqPlaylistData.extm3u);
        throw new Error('file still encoding!..');
    }
    console.log(':: tb playlist:', reqPlaylistData.extm3u);
    return reqPlaylistData.extm3u;
}

function genPlayerHeader(videoTitle = ''){
    
    const videoTitleEl = createHtmlEl(`
        <div id="video-title" class="vjs-header-bar">
            <span class="header-back-button"></span>
            <span class="header-description"></span>
        </div>
    `);
    
    videoTitleEl.qSel('.header-back-button').addEventListener('click', () => {
        closePlayerBox(false);
    }, false);
    videoTitleEl.qSel('.header-description').innerText = videoTitle;
    
    document.title = document.title.split(' - ')[0];
    document.title += ' - ' + videoTitle;
    
    if(player?.player_){
        qSel('.video-js').append(videoTitleEl);
        return;
    }
    if(!qSel('#video-title')){
        qSel('#player-box').append(videoTitleEl);
    }
}

function createEmbedControlBar(){
    const embedContolBar = createHtmlEl(`
        <div class="vjs-control-bar vjs-embed" dir="ltr"/>
    `);
    
    qSel('#player-box').append(embedContolBar);
}

function makeControlButton(type = '', new_video_id = ''){
    const curChannel = tvData.filter(s => s.channel_id == channel_id);
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
    
    const controlButton = createHtmlEl(`
        <button class="vjs-control vjs-button">
            <span class="vjs-icon-placeholder"></span>
            <span class="vjs-control-text"></span>
        </button>
    `);
    
    controlButton.classList.add(buttonCfg.class);
    
    controlButton.title = buttonCfg.text;
    controlButton.qSel('.vjs-control-text').innerText = buttonCfg.text;
    
    controlButton.addEventListener('click', async () => {
        video_id = new_video_id;
        await showPlayerBox();
    }, false);
    
    qSel('#player-box .vjs-control-bar').prepend(controlButton);
}

function addDownloadButton(url){
    
    const downloadButton = createHtmlEl(`
        <button class="vjs-download-button vjs-control vjs-button">
            <span class="vjs-icon-placeholder"></span>
            <span class="vjs-control-text"></span>
        </button>
    `);
    
    downloadButton.title = 'Download';
    downloadButton.qSel('.vjs-control-text').innerText = 'Download';
    
    downloadButton.addEventListener('click', async () => {
        const dlLink = document.createElement('a');
        dlLink.setAttribute('download', '');
        dlLink.setAttribute('target', '_blank');
        dlLink.href = url;
        // document.body.append(dlLink);
        dlLink.click();
        dlLink.remove();
    }, false);
    
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
    const loadingHtml = createHtmlEl('<div id="video-loading"><div><span></span></div></div>');
    loadingHtml.qSel('span').innerText = `${getTlText('Loading')}...`;
    qSel('#player-box').append(loadingHtml);
}

function showErrorPlayerBox(errArr){
    removeChildEls('#player-box');
    qSel('#player-close-button').style.display = 'block';
    qSel('#player-close-button').addEventListener('click', () => { closePlayerBox(true); }, false);
    
    const errHTML = document.createDocumentFragment();
    for(let errIdx in errArr){
        const errEl = createHtmlEl('<span></span>');
        errEl.innerText = errArr[errIdx];
        errHTML.append(errEl);
        if(errArr.length > errIdx+1){
            errHTML.append(createHtmlEl('<br/>'));
        }
    }
    
    const videoErrDiv = createHtmlEl('<div id="video-error"><div></div></div>');
    videoErrDiv.qSel('#video-error div').append(errHTML);
    qSel('#player-box').append(videoErrDiv);
}

function closePlayerBox(byCloseButton){
    if(player && player.player_){
        player.dispose();
    }
    
    if(qSel('#embed')){
        qSel('#embed').remove();
    }
    
    if(byCloseButton){
        qSel('#player-close-button').removeEventListener('click', closePlayerBox, false);
    }
    
    qSel('#player-box').style.display = 'none';
    qSel('#player-close-button').style.display = 'none';
    qSel('body').style.overflow = 'auto';
    document.title = document.title.split(' - ')[0];
    
    history.replaceState(hstate, htitle, `/${tvRegion}/` + (channel_id != '' ? 'channel?id=' + channel_id : ''));
}

function genPlayer(videoUrl, videoType, posterUrl, captionsUrl){
    if(videoType == 'embed'){
        const embedEl = createHtmlEl('<iframe id="embed" scrolling="no" allowfullscreen="allowfullscreen"></iframe>');
        embedEl.src = videoUrl;
        qSel('#player-box').append(embedEl);
        return;
    }
    
    const playerId = 'playerContainer';
    const videoEl = createHtmlEl('<video class="video-js" controls preload="auto" data-setup="{}"/>');
    videoEl.id = playerId;
    
    if(posterUrl){
        videoEl.dataset.setup = JSON.stringify({
            poster: posterUrl,
        });
    }
    
    const sourceEl = createHtmlEl('<source/>');
    sourceEl.src = videoUrl;
    sourceEl.type = videoType;
    
    videoEl.append(sourceEl);
    
    if(captionsUrl){
        const trackEl = createHtmlEl('<track kind="captions" label="CC"/>');
        trackEl.src = captionsUrl;
        videoEl.append(trackEl);
    }
    
    qSel('#player-box').append(videoEl);
    initVideoJSPlayer(playerId);
}

function initVideoJSPlayer(playerId){
    player = videojs('#' + playerId, {
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
