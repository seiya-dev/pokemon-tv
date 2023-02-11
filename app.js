// build-in modules
import fs from 'fs';
import path from 'path';

// dependencies
import gm from 'got';
import ProxyAgent from 'proxy-agent';

// argv
import yargs from 'yargs/yargs';
const argv = yargs(process.argv).argv;

// helpers
const __dirname = path.resolve();
const jsonLoad = (file) => {
    return JSON.parse(fs.readFileSync(file));
};

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

// set proxy agent
if(argv.proxy){
    gotCfg.agent = { https: new ProxyAgent(argv.proxy) };
}

// set req module cfg
const got = gm.extend(gotCfg);

// program
const packageJson = jsonLoad(path.join(__dirname, 'package.json'));
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

// set tvs
const selTvRegions = Object.keys(tvRegion).indexOf(argv.cc) > -1 ? [argv.cc] : Object.keys(tvRegion);

// run app
(async () => {
    // await indexOldBuckups();
    if(!argv.index){
        await tryChannelsApi();
    }
    await indexDb();
})();

// try channels
async function tryChannelsApi(){
    for(let cc of selTvRegions){
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
    try{
        mediaList = JSON.parse(mediaList.body);
    }
    catch(e){
        console.log(`[ERROR] Can't parse video list, error: ${e}`);
        console.log(mediaList.body);
        return;
    }
    for (const c of mediaList){
        if(c.media_type == 'non-animation'){
            continue;
        }
        c.media = editMediaArr(c.media);
        fs.mkdirSync(dirPath(cc), { recursive: true });
        const channelId = await getChannelId(c);
        saveData(dirPath(cc) + channelId + '.json', c);
    }
}

async function getChannelId(c, skipCatName){
    const chImg = c.channel_images.dashboard_image_1125_1500;
    const chId = chImgClean(chImg).split('/').slice(0, -1);
    const cat = findCat(c, chImg);
    
    if(chId.length == 1 && chImg.match(/\/movie14w/)){
        chId[0] = 'movie14w';
    }
    
    if(chId.length == 1 && chImg.match(/\/movie14b/)){
        chId[0] = 'movie14b';
    }
    
    if(cat.name != '' && !skipCatName){
        chId.unshift(cat.name);
    }
    
    if(skipCatName && chId.length > 1){
        chId.shift();
    }
    
    return chId.join('-');
}

function chImgClean(img){
    return img.split('/').slice(8).join('/');
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
        if(m[v].skimming_thumbnail_url_base){
            m[v].skimming_thumbnail_url_base = fixUrl(m[v].skimming_thumbnail_url_base);
        }
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
    return dbfolder + cc + '/';
}

function saveData(path, data){
    const jsonStr = JSON.stringify(data, null, '    ')
        .replace(/\r/g, '').replace(/\n/g, '\r\n') + '\r\n';
    fs.writeFileSync(path, jsonStr);
}

async function indexDb(){
    const dbData = {};
    for(let cc of selTvRegions){
        console.log(`# ${cc} Indexing ${tvRegion[cc]} channel data...`);
        const ccfolder = fs.readdirSync(dirPath(cc));
        dbData[cc] = [];
        for(let f of ccfolder){
            const data = jsonLoad(dirPath(cc) + f);
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
                channel_id: await getChannelId(data, true),
                channel_id_ext: data.channel_id,
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
        cat.name = 'series';
    }
    else if(chImg.match(/\/stunts\//)){
        cat.category_id = 2;
        cat.category = 'Stuns';
        cat.name = '';
    }
    else if(data.media_type == 'movie'){
        cat.category_id = 3;
        cat.category = 'Movies';
        cat.name = 'movies';
    }
    else if(data.media_type == 'original'){
        cat.category_id = 4;
        cat.category = 'Specials';
        cat.name = 'original';
    }
    else if(data.media_type == 'junior'){
        cat.category_id = 5;
        cat.category = 'Junior';
        cat.name = 'junior';
    }
    else{
        cat.category_id = 9;
        cat.category = 'Unsorted';
        cat.name = 'unsorted';
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

// ----------------------------------------------------------------

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
    const data = jsonLoad(dbfolderBk + file);
    const ltable = [];
    for(let c of data){
        if(c.media_type == 'non-animation'){
            continue;
        }
        
        c.channel_images = fixImgObj(c.channel_images);
        c.media = editMediaArr(c.media);
        
        const chImg = c.channel_images.dashboard_image_1125_1500;
        const cat = findCat(data, chImg);
        const channelId = await getChannelId(c);
        if(cat.category_id == 1 && chImg.match(/vol/)){
            continue;
        }
        
        const file = cc + '_' + channelId + ( cat.category_id == 2 ? '_' + date : '' );
        ltable.push({ ch: channelId, img: chImgClean(chImg), v: c.media.length });
        saveData(dbfolderBk + '/parsed/' + file + '.json', c);
    }
    console.log('Backup @ %s %s', cc, date);
    console.table(ltable);
}

