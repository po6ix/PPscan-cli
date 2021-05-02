const puppeteer = require('puppeteer');
const { Patterns } = require('./patterns')
const chalk = require('chalk');

const URL_REGEX = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

const blacklist = [
    "https://www.google.com/pagead/conversion_async.js:19:76",
    "https://www.google.com/pagead/conversion.js:28:76",
    "https://www.googleadservices.com/pagead/conversion_async.js:19:76",
    "https://www.googleadservices.com/pagead/conversion.js:28:76",
    "https://fast.wistia.com/assets/external/E-v1.js",
];

const executionDelay = 3000;
const scanTypes = ['script', 'document'];

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
                headless: false,
                // userDataDir: String.raw`C:\Users\uso52\AppData\Local\Google\Chrome\User Data\Profile 2`
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

function patternMatch(content) {

    Patterns.forEach((pattern) => {
        const { name, type, chunk } = pattern;

        switch (type) {
            case "regex":
                const re = new RegExp(chunk, "i");

                if (re.exec(content)) {
                    return true;
                }
                break;
            case "text":
                const position = content.indexOf(chunk);

                if (position != -1) {
                    return true;
                }
                break;
        }

        return false;
    });

}

function scanUrl(instance_id, target) {
    return new Promise((resolve) => {
        const ret = [new Set(), new Set()];
        
        waitForBrowser()
            .then((browser) => {
                browser.newPage()
                    .then(page => {
                        page.goto(target, { timeout: 2000 /* waitUntil: 'networkidle2'*/ })
                            .catch(e => {
                                console.log(chalk.red(`${instance_id} > ${e.name}`));
                            });

                        page.on('response', response => {
                            try {
                                const request = response.request();
                                const status = response.status();

                                if (status >= 300 && status <= 399) {
                                    return;   
                                }
                        
                                if (request.resourceType() == 'document') {
                                    ret[0].add(request.url());

                                    response.buffer()
                                        .then(buf => {
                                            const content = buf.toString();
                                            ret[1].add(content);

                                            while (match = URL_REGEX.exec(content)) {
                                                ret[0].add(match[0]);
                                            }
                                        });
                                }
                            } catch {}
                        });
                        setTimeout(() => {
                            page.close();
                            resolve(ret);
                        }, executionDelay);
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