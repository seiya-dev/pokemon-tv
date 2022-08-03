// shorthands
function selEl(el){
    return document.querySelector(el);
}
Element.prototype.append = function(html){
    this.insertAdjacentHTML('beforeend', html);
};
function cleanup(type){
    const photosNode = selEl('#'+type);
    while (photosNode.firstChild) {
        photosNode.removeChild(photosNode.firstChild);
    }
}

// get json
const getJson = (url, headers={}) => {
    return fetch(url, {mode: 'cors', headers: headers})
        .then(async function(r){
            if(r.status == 200){
                let jres = await r.text();
                if(jres.match(/^({|\[)/)){
                    jres = JSON.parse(jres);
                }
                else{
                    throw new Error('Forbidden 403!');
                }
                if(jres.error){
                    throw new Error(jres.error);
                }
                return jres;
            }
            else{
                if(r.status == 404){
                    throw new Error('Wrong parameters!');
                }
                else if(r.status == 403){
                    throw new Error('Forbidden 403!');
                }
                else if(r.status == 500){
                    throw new Error('Server Error!');
                }
                else{
                    throw new Error('Unknown error!');
                }
            }
        })
        .catch(function(e){
            throw new Error(e);
        });
};

function addEl(data){
    // create
    let newEl = document.createElement(data.type);
    // add text
    if(data.type == 'span' && !data.text){
        data.text = ' ';
    }
    newEl.innerText = data.text || '';
    // classes
    if(data.class){
        for(let c of data.class){
            newEl.classList.add(c);
        }
    }
    // dataset
    if(data.dataset){
        newEl.dataset = {};
        for(let d of Object.keys(data.dataset)){
            newEl.dataset[d] = data.dataset[d];
        }
    }
    // more options
    const optsColl = [
        'id',
        'value',
        'alt',
        'src',
        'target',
        'href',
        'controls',
        'autoplay',
        'loop',
        'download',
        'loading',
        'title',
    ];
    for(let o of optsColl){
        if(o in data){
            newEl[o] = data[o];
        }
    }
    // --
    return newEl;
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

