const videoApiReq = 'https://production-ps.lvp.llnw.net/r/PlaylistService/media';
const corsProxy = 'https://cors2.nyaku.xyz';

const tvRegions = {
    'us': { name: 'United States',  ip: '3.3.3.3',      },
    'uk': { name: 'UK',             ip: '86.5.53.25',   },
    'fr': { name: 'France',         ip: '2.2.2.2',      },
    'it': { name: 'Italia',         ip: '2.32.0.1',     },
    'de': { name: 'Deutschland',    ip: '2.160.0.1',    },
    'es': { name: 'España',         ip: '2.152.0.1',    },
    'el': { name: 'América Latina', ip: '8.14.224.1',   },
    'br': { name: 'Brasil',         ip: '179.93.224.1', },
    'ru': { name: 'Россия',         ip: '5.104.32.1',   },
    'dk': { name: 'Danmark',        ip: '2.128.0.1',    },
    'nl': { name: 'Nederland',      ip: '24.132.0.1',   },
    'fi': { name: 'Suomi',          ip: '37.130.160.1', },
    'no': { name: 'Norge',          ip: '92.221.54.1',  },
    'se': { name: 'Sverige',        ip: '46.195.212.1', },
};

const tlData = {
    us: {},
    ru: {
        Series: 'Сериалы',
        Stuns: 'Коллекции',
        Movies: 'Фильмы',
        Specials: 'Спец. выпуски',
        Junior: 'Для детей',
        Season: 'Сезон',
        Episodes: 'Серий',
        Episode: 'Серия',
        Loading: 'Загрузка',
    },
};

const imgBase64 = {
    poster: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAf4AAAKoCAQAAAA8WVXZAAAFxElEQVR42u3TQQ0AAAjEME4T/rXBFw+0EpYs0wU8FPOD+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+MD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD+Y3P5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPxgfhHA/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/mB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB/MD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5wfyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+cH8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD+Y3/xgfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzg/nND+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+cH8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD+YXwQwP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wP5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5wfyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+MD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzg/kB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfjA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA/mNz+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YH8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8YH7zg/kB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfjA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA/mFwHMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfOD+QHzA+YHzA+YHzA/YH7A/ID5AfMD5gfMD5gfMD9gfsD8gPkB8wPmB8wPmB8wP2B+MD9gfsD8gPkB8wPmB8wPmB8wP2B+wPyA+QHzA+YHzA+YHzA/YH7A/ID5AfMD5geuBfEyL6ZN6SINAAAAAElFTkSuQmCC',
    channel: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAxCAQAAAAFbP2gAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQflBwgQJRltdw85AAAARElEQVRo3u3OQQ0AIAwEMMDS/GtjPyzcSFoF3bfWR046oDuHrq6urq6urq5umq6urq6urq6ubpqurq6urq6urm6aru7TlekBlGVikYAAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDctMDhUMTY6Mzc6MjUrMDA6MDB0UH0/AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTA3LTA4VDE2OjM3OjI1KzAwOjAwBQ3FgwAAAABJRU5ErkJggg==',
    episode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK8AAABjCAQAAABHsZgxAAAAlUlEQVR42u3QMQEAAAgDIJfJ/tk0xT6IQG6HmujVqxe9evWiV69e9OrVi1696NWrF7169aJXr1706kWvXr3o1asXvXr1olevXvTqRa9evejVqxe9evWiVy969epFr1696NWrF7169aJXL3r16kWvXr3o1asXvXrRq1cvevXqRa9evejVq1evXr3o1asXvXr1olevXgoe2UB2usWr9LoAAAAASUVORK5CYII=',
};
