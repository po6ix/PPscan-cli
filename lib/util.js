const puppeteer = require('puppeteer');
const { Patterns } = require('./patterns')
const chalk = require('chalk');
const { encode, decode } = require('html-entities');

const URL_REGEX = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

const BLACKLIST = [
    "https://www.google.com/pagead/conversion_async.js",
    "https://www.google.com/pagead/conversion.js",
    "https://www.googleadservices.com/pagead/conversion_async.js",
    "https://www.googleadservices.com/pagead/conversion.js",
    "https://fast.wistia.com/assets/external/E-v1.js",
];

const EXECUTE_TIME = 10000;
const SCAN_TYPES = ['script', 'document'];

let browser = null;

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

function waitForBrowser() {
    return new Promise(function (resolve) {
        if (browser === null) {
            puppeteer.launch({
                // headless: false,
                // userDataDir: String.raw`...`
            }).then(_browser => {
                resolve(browser = _browser);
            });
        } else {
            resolve(browser);
        }
    });
}

function closeBrowser() {
    return new Promise((resolve) => {
        browser.close()
            .then(() => {
                resolve()
            });
    });
}

const already_seen = new Set();

function patternMatch(instance_id, target, key, content) {
    if (!already_seen.has(target+key) && !BLACKLIST.includes[key]) {
        already_seen.add(target+key);

        Patterns.forEach((pattern) => {
            const { name, type, chunk } = pattern;

            switch (type) {
                case "regex":
                    const re = new RegExp(chunk, "i");

                    if (re.exec(content)) {
                        console.log(chalk.green(`${instance_id} > matched ${JSON.stringify(key)} used by ${JSON.stringify(target.href)}`));
                        return;
                    }
                    break;
                case "text":
                    const position = content.indexOf(chunk);

                    if (position != -1) {
                        console.log(chalk.green(`${instance_id} > matched ${JSON.stringify(key)} used by ${JSON.stringify(target.href)}`));
                        return;
                    }
                    break;
            }
        });
    }
}

function scanUrl(instance_id, target) {
    return new Promise((resolve) => {
        const ret = [new Set(), new Object()];
        
        waitForBrowser()
            .then((browser) => {
                browser.newPage()
                    .then(page => {
                        page.goto(target, { timeout: EXECUTE_TIME /* waitUntil: 'networkidle2'*/ })
                            .catch(e => {
                                console.log(chalk.red(`${instance_id} > [1] ${e.name}`));
                            });

                        page.on('response', response => {
                            try {
                                const request = response.request();
                                const status = response.status();
                                const requestUrl = request.url();

                                if (status >= 300 && status <= 399) {
                                    return;
                                }
                        
                                ret[0].add(requestUrl);

                                response.buffer()
                                    .then(buf => {
                                        const content = buf.toString();
                                        ret[1][requestUrl] = content;

                                        while (match = URL_REGEX.exec(content)) {
                                            ret[0].add(decode(decode(match[0])));
                                        }
                                    })
                                    .catch(e => e);
                            } catch (e) {
                                console.log(e)
                            }
                        });

                        setTimeout(() => {
                            page.close();
                            resolve(ret);
                        }, EXECUTE_TIME);
                    })
                    .catch(e => {
                        console.log('Error while loading page: ', e);
                    });
            });
    });
}

module.exports = {
    delay,
    scanUrl,
    closeBrowser,
    patternMatch
};
