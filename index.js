const r = require('rxjs');
const fs = require('fs');
const s = require('string');
const _ = require('lodash');
const rh = require('@akanass/rx-http-request');
const che = require('cheerio');

const read = r.Observable.bindNodeCallback(fs.readFile);
const write = r.Observable.bindNodeCallback(fs.writeFile);

function get(cacheMeOutside, url) {
    return r.Observable.if(() => cacheMeOutside[url],
            r.Observable.of(cacheMeOutside[url]),
            rh.RxHR.get(url)
                .retry()
                .pluck('body')
                .do(a => cacheMeOutside[url] = a)
                .map(che.load)
        )
}

r.Observable.forkJoin([
    read('./items.json', 'utf-8').map(JSON.parse).catch(a => write('./items.json', '{}').mapTo('{}').map(JSON.parse)),
    read('./http.json', 'utf-8').map(JSON.parse).catch(a => write('./http.json', '{}').mapTo('{}').map(JSON.parse))
])
    .flatMap(cache => r.Observable.of(cache[0])
        .flatMap(items => r.Observable.of(cache[1])
            .flatMap(https => get(https, 'https://gogoanime.se/anime-list.html?page=1')
                .flatMap(a => a('.anime_list_body > .listing > li > a'))
                .map(a => [a.attribs.href, a.children[0].data])
            )
        )
    )
    .subscribe(
        console.log,
        console.error,
        () => console.log('done')
    );
