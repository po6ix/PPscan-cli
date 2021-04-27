const fs = require('fs');
const readline = require('readline');
const process = require('process');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./resource/db.sql');
const domainList = process.argv[2] ? process.argv[2] : './resource/domain.csv';

(async function() {
    const fileStream = fs.createReadStream(domainList);

    const chunk = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const url of chunk) {
        if (url) {
            db.run('insert into domains values (?, 0)', [url]);
        }
    }
})();