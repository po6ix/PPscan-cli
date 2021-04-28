const puppeteer = require('puppeteer');
const { patterns } = require('./patterns')
const sqlite3 = require('sqlite3');
const chalk = require('chalk');

const db = new sqlite3.Database('./resource/db.sql');

const blacklist = [
    "https://www.google.com/pagead/conversion_async.js:19:76",
    "https://www.google.com/pagead/conversion.js:28:76",
    "https://www.googleadservices.com/pagead/conversion_async.js:19:76",
    "https://www.googleadservices.com/pagead/conversion.js:28:76",
    "https://fast.wistia.com/assets/external/E-v1.js",
];

const executionDelay = 3000;
const scanTypes = ['script', 'document'];

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

async function scan(target) {
    console.log(chalk.green('[*] ' + target.href));

    const browser = await puppeteer.launch({
        // headless: false,
    });

    const page = await browser.newPage();

    page.on('response', response => {
        const request = response.request();
        const chain = response.request().redirectChain();

        if (scanTypes.includes(request.resourceType()) && chain.length == 0) {
            const requestUrl = request.url();

            response.buffer().then(buf => {

                const content = buf.toString();

                const result = [];
                const matches = [];

                patterns.forEach((pattern) => {
                    const { name, type, chunk } = pattern;

                    switch (type) {
                        case "regex":
                            const re = new RegExp(chunk, "i");
                            const match = re.exec(content);

                            if (match) {
                                result.push(name);
                                matches.push(match);
                            }
                            break;
                        case "text":
                            const position = content.indexOf(chunk);

                            if (position != -1) {
                                result.push(name);
                                matches.push({ index: position });
                            }
                            break;
                    }
                });


                result.forEach((name, i) => {
                    const preChunk = content.substr(0, matches[i].index).split(/\n/);
                    const line = preChunk.length;
                    const column = preChunk[preChunk.length - 1].length;

                    if (blacklist.includes(requestUrl)) {
                        return;
                    }

                    db.run('insert into reports(url, file, line, column, content) select ?, ?, ?, ?, ? where not exists(select 1 from reports where url = ? and file = ? and line = ? and column = ?)', [
                        target.href,
                        requestUrl,
                        line,
                        column,
                        name,
                        target.href,
                        requestUrl,
                        line,
                        column,
                    ]);
                    console.log(chalk.yellow(`[@] ${requestUrl} (${line}:${column}) : ${name}`));
                });

            });
        }
    });

    try {
        await page.goto(target, { timeout: 2000 /* waitUntil: 'networkidle2'*/ });
        await delay(executionDelay);
    } catch (e) {
        await browser.close();
        throw e;
        // console.log(e);
    }

    await browser.close();
};

module.exports = {
    delay,
    scan
};