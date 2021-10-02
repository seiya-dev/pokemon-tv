// build-in modules
const fs   = require('fs');
const path = require('path');

// req module
const got = require('got').extend({
    headers: { 
        'user-agent': [
            'Mozilla/5.0',
            '(Windows NT 10.0; Win64; x64; rv:70.0)',
            'Gecko/20100101 Firefox/70.0',
        ].join(' '),
    },
});

// program
const packageJson = require(path.join(__dirname, 'package.json'));
console.log(`\n=== ${packageJson.programName} ${packageJson.version} ===\n`);
const dbfolder = path.join(__dirname, '/database/');
const dbfolderBk = path.join(__dirname, '/database_bk/');

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

const oldBk = [];

// run app
(async () => {
    await tryChannelsApi();
    for(let bk of oldBk){
        parseBackupChannel(bk[0], bk[1]);
    }
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
    try{
        mediaList = await got(`https://www.pokemon.com/api/pokemontv/v2/channels/${cc}/`);
    }
    catch(e){
        console.log(`[ERROR] Can't get video list, error code: ${e.code}`);
        return;
    }
    console.log(`# ${cc} Downloading ${tvRegion[cc]} channel data...`);
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

async function parseBackupChannel(cc, file){
    const data = require(dbfolderBk + file);
    for(let c of data){
        const chImg = c.channel_images.dashboard_image_1125_1500;
        const cat = findCat(c, chImg);
        
        if(cat.category_id == 1 && chImg.match(/vol/)){
            continue;
        }
        
        console.log(cat.category, chImg);
        c.media = editMediaArr(c.media);
        saveData(dirPath(cc) + c.channel_id + '.json', c);
    }
}

// fix media
function editMediaArr(m){
    for (let v in m){
        delete m[v].count;
        delete m[v].rating;
    }
    return m;
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
        dbData[cc] = { data: [], channels: [] };
        for(let f of ccfolder){
            const data = require(dirPath(cc) + f);
            const chImg = data.channel_images.dashboard_image_1125_1500;
            const cat = findCat(data, chImg);
            
            Object.assign(data, cat);
            data.order = data.watch_now_order;
            
            if(data.category_id == 2 || data.category_id == 9){
                data.order = data.channel_creation_date * -1;
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
            
            const chanData = {
                channel_id: data.channel_id,
                channel_name: data.channel_name,
                stunt_channel: data.stunt_channel,
                channel_image: chImg,
                media_type: data.media_type,
                order: data.order,
                category_id: data.category_id,
                category: data.category,
            };
            
            dbData[cc].data.push(chanData);
            dbData[cc].channels.push(data);
        }
        dbData[cc].data.sort(sortItems);
        dbData[cc].channels.sort(sortItems);
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
