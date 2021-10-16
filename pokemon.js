// build-in modules
const fs   = require('fs');
const path = require('path');
const ProxyAgent = require('proxy-agent');

// got config
const gotCfg = {
    headers: { 
        'user-agent': [
            'Mozilla/5.0',
            '(Windows NT 10.0; Win64; x64; rv:70.0)',
            'Gecko/20100101 Firefox/70.0',
        ].join(' '),
    },
};

// proxy
const myArgs = process.argv.slice(2);
const proxy = myArgs[0] && myArgs[0] != '' ? myArgs[0] : '';

if(proxy != ''){
    gotCfg.agent = { https: new ProxyAgent(proxy) };
}

// req module
const got = require('got').extend(gotCfg);

// program
const packageJson = require(path.join(__dirname, 'package.json'));
console.log(`\n=== ${packageJson.programName} ${packageJson.version} ===\n`);
const dbfolder = path.join(__dirname, '/database/');
const dbfolderBk = path.join(__dirname, '/old_backups/');

// regions
const tvRegion = {
    'us': 'United States',
    'uk': 'UK',
    'fr': 'France',
    'it': 'Italia',
    'de': 'Deutschland',
    'es': 'España',
    'el': 'América Latina',
    'br': 'Brasil',
    'ru': 'Россия',
    'dk': 'Danmark',
    'nl': 'Nederland',
    'fi': 'Suomi',
    'no': 'Norge',
    'se': 'Sverige',
};

// run app
(async () => {
    await indexOldBuckups();
    await tryChannelsApi();
    indexDb();
})();

// try channels
async function tryChannelsApi(){
    for(let cc of Object.keys(tvRegion)){
        await getChannelApi(cc);
    }
}

// download channel
async function getChannelApi(cc, mediaList){
    console.log(`# ${cc} Downloading ${tvRegion[cc]} channel data...`);
    try{
        mediaList = await got(`https://www.pokemon.com/api/pokemontv/v2/channels/${cc}/`);
    }
    catch(e){
        console.log(`[ERROR] Can't get video list, error code: ${e.code}`);
        return;
    }
    mediaList = JSON.parse(mediaList.body);
    for (const c of mediaList){
        if(c.media_type == 'non-animation'){
            continue;
        }
        c.media = editMediaArr(c.media);
        fs.mkdirSync(dirPath(cc), { recursive: true });
        saveData(dirPath(cc) + c.channel_id + '.json', c);
    }
}

async function indexOldBuckups(){
    if(!fs.existsSync(dbfolderBk)){
        return;
    }
    const oldDbFiles = fs.readdirSync(dbfolderBk);
    if(!fs.existsSync(dbfolderBk + '/parsed/')){
        fs.mkdirSync(dbfolderBk + '/parsed/');
    }
    for(const file of oldDbFiles){
        if(!file.match(/\.json$/)){
            continue;
        }
        parseBackupChannel(file);
    }
}

async function parseBackupChannel(file, cc, date){
    cc = file.split('.')[0];
    date = file.split('.')[1];
    const data = require(dbfolderBk + file);
    const ltable = [];
    for(let c of data){
        c.channel_images = fixImgObj(c.channel_images);
        const chImg = c.channel_images.dashboard_image_1125_1500;
        const cat = findCat(c, chImg);
        
        if(cat.category_id == 1 && chImg.match(/vol/)){
            continue;
        }
        
        c.media = editMediaArr(c.media);
        ltable.push({ cat: cat.category, ch: c.channel_id, img: chImgRplc(chImg), v: c.media.length });
        saveData(dbfolderBk + '/parsed/' + cc + '_' + date + '_' + c.channel_id + '.json', c);
    }
    console.log('Backup @ %s %s', cc, date);
    console.table(ltable);
}

function chImgRplc(img){
    return img.replace(/https:\/\/assets.pokemon.com\/assets\/cms2(-\w{2})?(-\w{2})?\/img\/watch-pokemon-tv\/pokemon-tv-app/, '');
}

// fix media
function editMediaArr(m){
    for (let v in m){
        delete m[v].count;
        delete m[v].rating;
        m[v].images = fixImgObj(m[v].images);
        m[v].stream_url  = fixUrl(m[v].stream_url);
        m[v].captions    = fixUrl(m[v].captions);
        m[v].offline_url = fixUrl(m[v].offline_url);
    }
    return m;
}

function fixImgObj(obj){
    for(let k of Object.keys(obj)){
        obj[k] = fixUrl(obj[k]);
    }
    return obj;
}

function fixUrl(url){
    if(url.match('web.archive.org')){
         url = url.replace(/https?:\/\/web\.archive\.org\/web\/\d+\//, '');
    }
    return url;
}

// make dir path
function dirPath(cc){
    return dbfolder + '/' + cc + '/';
}

function saveData(path, data){
    fs.writeFileSync(path, JSON.stringify(data, null, '    ').replace('\n', '\r\n') + '\r\n');
}

function indexDb(){
    const dbData = {};
    for(let cc of Object.keys(tvRegion)){
        console.log(`# ${cc} Indexing ${tvRegion[cc]} channel data...`);
        const ccfolder = fs.readdirSync(dirPath(cc));
        dbData[cc] = [];
        for(let f of ccfolder){
            const data = require(dirPath(cc) + f);
            const chImg = data.channel_images.dashboard_image_1125_1500;
            const cat = findCat(data, chImg);
            Object.assign(data, cat);
            data.order = data.channel_creation_date * -1;
            
            if(data.category_id == 1){
                const ssNum = chImg.match(/\/season(\d+)\//);
                if(ssNum){
                    let idxNum = parseInt(ssNum[1]) * -1000;
                    data.order = idxNum;
                }
                else{
                    console.log('[WARN] Cant find season num:', chImg);
                }
            }
            if(data.category_id == 3){
                const movNum = chImg.match(/\/movie(\d+)\//);
                if(movNum){
                    let idxNum = parseInt(movNum[1]) * -1000;
                    data.order = idxNum;
                    if(chImg.match(/\/movie14w-/)){
                        data.order = idxNum - 1;
                    }
                }
                else{
                    console.log('[WARN] Cant find movie num:', chImg);
                }
            }
            
            const chData = {
                channel_id: data.channel_id,
                channel_name: data.channel_name,
                channel_description: data.channel_description,
                channel_images: data.channel_images,
                category_id: data.category_id,
                category: data.category,
                order: data.order,
                channel_creation_date: data.channel_creation_date,
                channel_update_date: data.channel_update_date,
                media: [],
            };
            
            for(let m of data.media){
                const mediaData = {
                    id: m.id,
                    season: m.season,
                    episode: m.episode,
                    title: m.title,
                    description: m.description,
                    images: m.images,
                    stream_url: m.stream_url,
                    captions: m.captions,
                    offline_url: m.offline_url,
                    size: m.size,
                };
                chData.media.push(mediaData);
            }
            
            dbData[cc].push(chData);
        }
        dbData[cc].sort(sortItems);
        saveData('watch/data/' + cc + '.json', dbData[cc]);
    }
}

function findCat(data, chImg){
    const cat = {};
    if(data.media_type == 'episode' && !chImg.match(/\/stunts\//)){
        cat.category_id = 1;
        cat.category = 'Series';
    }
    else if(chImg.match(/\/stunts\//)){
        cat.category_id = 2;
        cat.category = 'Stuns';
    }
    else if(data.media_type == 'movie'){
        cat.category_id = 3;
        cat.category = 'Movies';
    }
    else if(data.media_type == 'original'){
        cat.category_id = 4;
        cat.category = 'Specials';
    }
    else if(data.media_type == 'junior'){
        cat.category_id = 5;
        cat.category = 'Junior';
    }
    else{
        cat.category_id = 9;
        cat.category = 'Unsorted';
    }
    return cat;
}

function sortItems(a, b){
    if(a.category_id < b.category_id){
        return -1;
    }
    if(a.category_id > b.category_id){
        return 1;
    }
    if(a.category_id == b.category_id && a.order < b.order){
        return 1;
    }
    if(a.category_id == b.category_id && a.order > b.order){
        return -1;
    }
    return 0;
}
