const fs = require('fs');
const readline = require('readline');
const process = require('process');

const { scan } = require('./lib/util');
const domainList = process.argv[2] ? process.argv[2] : './resource/domain.csv';

(async function() {
    const fileStream = fs.createReadStream(domainList);

    const chunk = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const url of chunk) {
        if (url == '') continue;

        try {
            let target;

            if (url.startsWith('http://') || url.startsWith('https://')) {
                target = new URL(url);
            } else {
                target = new URL('http://' + url);
            }

            await scan(target);
        } catch (e) {
            console.log(url, e);
        }
    }
})();