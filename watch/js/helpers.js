const qSel = (target) => {
    return document.querySelector(target);
};

const qSelAll = (target) => {
    return document.querySelectorAll(target);
};

const removeChildEls = (parentElId) => {
    const parentEl = qSel('#' + parentElId);
    while (parentEl.firstChild) {
        parentEl.removeChild(parentEl.firstChild);
    }
};

const appendHTML = (target, html) => {
    return qSel(target).insertAdjacentHTML('beforeend', html);
};

function createEl(type, data={}){
    const el = document.createElement(type);
    if(type == 'span' && !data.text){
        data.text = ' ';
    }
    el.innerText = data.text || '';
    if(data.class){
        for(const c of data.class){
            el.classList.add(c);
        }
    }
    if(data.dataset){
        for(const d of Object.keys(data.dataset)){
            el.dataset[d] = data.dataset[d];
        }
    }
    const elOpts = [
        'id',
        'value',
        'alt',
        'src',
        'target',
        'href',
        'controls',
        'autoplay',
        'loop',
        'preload',
        'download',
        'kind',
        'label',
        'default',
        'loading',
        'title',
        'innerHTML',
        'innerText',
    ];
    for(let o of elOpts){
        if(o in data){
            el[o] = data[o];
        }
    }
    if(data.event && data.event.type && data.event.func){
        el.addEventListener(data.event.type, data.event.func, false);
    }
    if(data.child){
        for(let child of data.child){
            if(child && !child.notEl){
                el.appendChild(child);
            }
        }
    }
    return el;
}

const doReq = async (url, headers={}) => {
    try {
        const res = await fetch(url, {mode: 'cors', headers: headers});
        res.text = await res.text();
        try{
            res.json = JSON.parse(res.text);
        }
        catch(e){}
        if(res.text.match(/^#EXTM3U/)){
            const parser = new m3u8Parser.Parser();
            parser.push(res.text);
            parser.end();
            res.extm3u = parser.manifest;
        }
        return res;
    }
    catch(err){
        return { ok: false, err };
    }
};

function u2s(url){
    return url.replace(/^http:/,'https:');
}

function rtmp2http(url){
    const rtmpLimelightDomain = url.split(':')[1].split('/')[2];
    const httpLimelightDomain = limelightDomains[rtmpLimelightDomain] ?
        limelightDomains[rtmpLimelightDomain] : rtmpLimelightDomain.replace(/\.csl\./,'.cpl.');
    const path = url.split(':')[2];
    return `https://${httpLimelightDomain}/${path}`;
}

const limelightDomains = {
    's2.csl.delvenetworks.com': 's2.cpl.delvenetworks.com',
    's2.csl.video.llnw.net':    's2.content.video.llnw.net',
};
