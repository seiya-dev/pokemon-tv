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
    await tryChannelsApi();
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
    console.log(`# ${cc} ${tvRegion[cc]}`);
    mediaList = JSON.parse(mediaList.body);
    for (const c of mediaList){
        if(c.media_type == 'non-animation'){
            continue;
        }
        c.media = editMediaArr(c.media);
        fs.mkdirSync(dirPath(cc), { recursive: true });
        fs.writeFileSync(
            dirPath(cc) + c.channel_id + '.json',
            JSON.stringify(c, null, '    ').replace('\n', '\r\n') + '\r\n'
        );
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
