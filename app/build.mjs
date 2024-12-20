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
const webfolder = path.join(__dirname, '/web/data/');

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
    // 'ru': 'Россия',
    'dk': 'Danmark',
    'nl': 'Nederland',
    'fi': 'Suomi',
    'no': 'Norge',
    'se': 'Sverige',
    'yt': 'YouTube',
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
            
            cdata.id = channelId;
            cdata.title = vdata.title || '';
            cdata.description = vdata.description || '';
            cdata.images = vdata.images || { dashboard: '', spotlight: '' };
            
            Object.assign(cdata, findCat(mTypeCat));
            cdata.order = vdata.order;
            
            if(cdata.category_id == 1.1){
                const seriesNum = cdata.id.match(/^season(?<num>\d+)$/);
                if(seriesNum && seriesNum.groups.num){
                    const seriesNumInt = parseInt(seriesNum.groups.num);
                    cdata.order = seriesNumInt * -1000;
                }
            }
            if(cdata.category_id == 3){
                const movieNum = cdata.id.match(/^movie(?<num>\d+)(?<sub>\w)?$/);
                if(movieNum && movieNum.groups.num){
                    const movieNumInt = parseInt(movieNum.groups.num);
                    cdata.order = movieNumInt * -1000;
                    if(movieNumInt == 14 && movieNum.groups.sub == 'w'){
                        cdata.order -= 1;
                    }
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
                    poketv_url: m.poketv_url || '',
                    // stream_url: m.stream_url || '',
                    embed_url: m.embed_url || '',
                    // terabox_surl: m.terabox_surl || '',
                    // captions: m.captions || '',
                };
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
        saveJson(webfolder + '/' + cc + '.json', dbData, true);
    }
}

function findCat(mTypeCat){
    const cat = {};
    switch(mTypeCat){
        case 'series':
            cat.category_id = 1.1;
            cat.category = 'series';
            break;
        case 'horizons':
            cat.category_id = 1.2;
            cat.category = 'horizons';
            break;
        case 'stunts':
            cat.category_id = 2;
            cat.category = 'stuns';
            break;
        case 'movies':
            cat.category_id = 3;
            cat.category = 'movies';
            break;
        case 'original':
            cat.category_id = 4;
            cat.category = 'specials';
            break;
        case 'junior':
            cat.category_id = 5;
            cat.category = 'junior';
            break;
        default:
            cat.category_id = 9;
            cat.category = 'unsorted';
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
