// build-in modules
const fs   = require('fs');
const path = require('path');

// extra modules
const yargs    = require('yargs');
const got      = require('got').extend({
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
const dbfolder    = path.join(__dirname,'/database/');

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

// yargs
const argv = yargs
    .option('cc', {
        group: 'View:',
        describe: 'PTV region',
        choices: Object.keys(tvRegion),
        default: 'us',
        type: 'string'
    })
    .version(false)
    .help(false)
    .argv;


// app
getChannelsApi();

async function getChannelsApi(){
    for(let s of Object.keys(tvRegion)){
        argv.cc = s;
        await getChannelApi();
    }
    process.exit();
}

async function getChannelApi(mediaList){
    try{
        mediaList = await got(`https://www.pokemon.com/api/pokemontv/v2/channels/${argv.cc}/`);
    }
    catch(e){
        console.log(`[ERROR] Can't get video list, error code: ${e.code}`);
        return;
    }
    console.log(`# ${argv.cc} ${tvRegion[argv.cc]}`);
    mediaList = JSON.parse(mediaList.body);
    for (const c of mediaList){
        if(c.media_type == 'non-animation'){
            continue;
        }
        c.media = editMediaArr(c.media);
        fs.mkdirSync(dirPath(argv.cc), { recursive: true });
        fs.writeFileSync(
            dirPath(argv.cc) + c.channel_id + '.json',
            JSON.stringify(c, null, '    ').replace('\n', '\r\n') + '\r\n'
        );
    }
}

function editMediaArr(m){
    for (let v in m){
        delete m[v].count;
        delete m[v].rating;
    }
    return m;
}

function dirPath(cc){
    return dbfolder + '/' + cc + '/';
}
