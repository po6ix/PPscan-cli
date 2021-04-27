const puppeteer = require('puppeteer');
const { patterns } = require('./patterns')

const executionDelay = 3000;
const scanTypes = ['script', 'document'];

function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time);
    });
}

async function scan(target) {
    console.log('[*] ' + target.href);

    const browser = await puppeteer.launch({
        // headless: false,
    });

    const page = await browser.newPage();

    page.on('response', response => {
        const request = response.request();
        const chain = response.request().redirectChain();

        if (scanTypes.includes(request.resourceType()) && chain.length == 0) {
            console.log('[>] ' + request.url());


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

                if (result.length != 0) {
                    console.log(result, matches);
                }
            });

            // console.log(patterns.length);
        }
        // response.buffer().then(b => {
        //     // console.log(b.toString());
        // });
    });

    await page.goto(target, { waitUntil: 'networkidle2' });
    await delay(executionDelay);

    await browser.close();
};

module.exports = {
    scan
};