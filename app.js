// build-in modules
import fs from 'fs';
import path from 'path';

// helpers
const __dirname = path.resolve();
const jsonLoad = (file) => {
    return JSON.parse(fs.readFileSync(file));
};
function saveJson(path, data, min){
    const jsonStr = JSON.stringify(data, null, (min? '' : '    ')).replace(/\r/g, '') + '\n';
    fs.writeFileSync(path, jsonStr);
}

// program
const packageJson = jsonLoad(path.join(__dirname, 'package.json'));
console.log(`\n=== ${packageJson.programName} ${packageJson.version} ===\n`);
const dbfolder = path.join(__dirname, '/database/');
const wdbfolder = path.join(__dirname, '/watch/data/');

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
    await cleanupDb();
    await indexDb();
})();

// route path
function dirPath(cc){
    return dbfolder + cc + '/';
}

// cleanup db before index
async function cleanupDb(){
    for(let cc of Object.keys(tvRegion)){
        console.log(`# ${cc} Cleaning ${tvRegion[cc]} channel data...`);
        const ccfolder = fs.readdirSync(dirPath(cc));
        
        for(let f of ccfolder){
            const vdata = jsonLoad(dirPath(cc) + f);
            const cdata = {};
            
            const mTypeCat = f.replace(/\.json$/,'').split('-')[0];
            const channelId = f.replace(/\.json$/,'').split('-').slice(1).join('-');
            
            cdata.channel_id = channelId;
            cdata.channel_name = vdata.channel_name;
            cdata.channel_description = vdata.channel_description;
            cdata.channel_images = vdata.channel_images;
            
            if(!cdata.channel_images.spotlight_image_1660_940){
                console.warn('-> WARN: Missing spotlight image 1660x940:', mTypeCat, channelId);
            }
            
            Object.assign(cdata, findCat(mTypeCat));
            cdata.order = vdata.order;
            
            if(vdata.channel_creation_date){
                cdata.order = vdata.channel_creation_date * -1;
            }
            if(cdata.category_id == 1){
                const seriesNum = cdata.channel_id.match(/^season(?<num>\d+)$/);
                const seriesNumInt = parseInt(seriesNum.groups.num);
                cdata.order = seriesNumInt * -1000;
            }
            if(cdata.category_id == 3){
                const movieNum = cdata.channel_id.match(/^movie(?<num>\d+)(?<sub>\w)?$/);
                const movieNumInt = parseInt(movieNum.groups.num);
                cdata.order = movieNumInt * -1000;
                if(movieNumInt == 14 && movieNum.groups.sub == 'w'){
                    cdata.order -= 1;
                }
            }
            
            cdata.media = [];
            for(const m of vdata.media){
                const mediaData = {
                    id: m.id,
                    season: m.season,
                    episode: m.episode,
                    title: m.title,
                    description: m.description,
                    images: m.images,
                    stream_url: m.stream_url,
                    poketv_url: m.poketv_url,
                    captions: m.captions,
                    offline_url: m.offline_url,
                };
                if(cdata.category_id != 2 && m.id.match(/^[-0-9a-f]{32}$/) && m.poketv_url == ''){
                    console.warn('-> WARN: Missing poketv_url:', m.id, mTypeCat, channelId, m.season, m.episode);
                }
                cdata.media.push(mediaData);
            }
            
            saveJson(dirPath(cc) + f, cdata);
        }
    }
}

// do index
async function indexDb(){
    for(let cc of Object.keys(tvRegion)){
        console.log(`# ${cc} Indexing ${tvRegion[cc]} channel data...`);
        const ccfolder = fs.readdirSync(dirPath(cc));
        const dbData = [];
        for(let f of ccfolder){
            const chData = jsonLoad(dirPath(cc) + f);
            if(chData.category_id == 2){
                continue;
            }
            dbData.push(chData);
        }
        dbData.sort(sortItems);
        saveJson(wdbfolder + '/' + cc + '.json', dbData, true);
    }
}

function findCat(mTypeCat){
    const cat = {};
    switch(mTypeCat){
        case 'series':
            cat.category_id = 1;
            cat.category = 'Series';
            cat.media_type = 'episode';
            break;
        case 'stunts':
            cat.category_id = 2;
            cat.category = 'Stuns';
            cat.media_type = 'episode';
            break;
        case 'movies':
            cat.category_id = 3;
            cat.category = 'Movies';
            cat.media_type = 'movie';
            break;
        case 'original':
            cat.category_id = 4;
            cat.category = 'Specials';
            cat.media_type = 'original';
            break;
        case 'junior':
            cat.category_id = 5;
            cat.category = 'Junior';
            cat.media_type = 'junior';
            break;
        default:
            cat.category_id = 9;
            cat.category = 'Unsorted';
            cat.media_type = 'unsorted';
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
