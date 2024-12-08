const qSel = (target) => {
    return document.querySelector(target);
};

HTMLElement.prototype.qSel = function (target){
    return this.querySelector(target);
}

const removeChildEls = (parentElQuery) => {
    const parentEl = qSel(parentElQuery);
    while (parentEl.firstChild) {
        parentEl.removeChild(parentEl.firstChild);
    }
};

const createHtmlEl = (string) => {
    return new DOMParser().parseFromString(string.replace(/^\s+/gm, '').replace(/\r?\n/g, ''), 'text/html').body.firstChild;
}

function uriLoader(){
    let uri = new URL(location);
    
    const regDefType = '';
    const regUri = new RegExp('^/(?<region>\\w+/)?(?<page_type>\\w+)?$');
    const uriData = uri.pathname.match(regUri);
    
    const pageParam = uriData.groups;
    pageParam.page_type = pageParam.page_type || '';
    pageParam.query = uri.searchParams;
    
    return pageParam;
}

const doReq = async (url, headers={}) => {
    try {
        // console.log(url);
        const res = await fetch(url, {mode: 'cors', headers: headers});
        res.text = await res.text();
        try{
            res.json = JSON.parse(res.text);
        }
        catch(e){}
        if(res.text.match(/^#EXTM3U/)){
            res.text = res.text.replace(/\s/g, '\n') + '\n';
            res.text = res.text.replace(/#EXT-X-DISCONTINUITY\n/g, '');
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
