const process = require('process');
const chalk = require('chalk');
const { scanUrl, delay, closeBrowser, patternMatch } = require('./lib/util');
const { match } = require('assert');

const MAX_CONNECTION = 3;
const MAX_VERBOSITY = 1;
const EXTENSION_BLACKLIST = ['.jpg', '.png', 'jpeg', '.gif', '.css', '.ttf', '.js']
const INSTANCE_SIZE = 1;

const queue = [process.argv[2]];
const done = {};
const done_explicit = new Set();

const Instance = {
    SLEEP: 0,
    WORKING: 1
};

let connection = 0;
let baseHost = new URL(process.argv[2]).hostname;

if (!process.argv[2]) {
    process.stdout.write(`usage: ${process.argv[1]} <domain>\n`);
    process.exit();
}

function waitForConnection(i) {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (i === connection || connection < MAX_CONNECTION) {
                clearInterval(interval);
                resolve(true);
            }
        }, 100);
    });
}

function filter_url(url) {
    if (done_explicit.has(url)) {
        return true;
    }
    if (done[url] >= MAX_VERBOSITY) {
        return true;
    }

    if (url.indexOf('?') != -1) {
        done[url.substr(0, url.indexOf('?'))]++;
    }
    
    done_explicit.add(url);

    return false;

}

function filter_resource(url) {
    try {
        const { pathname, hostname } = new URL(url);

        if (EXTENSION_BLACKLIST.includes(pathname.substr(pathname.lastIndexOf('.')))) {
            return true;
        } else if (!hostname.endsWith(baseHost)) {
            return true;
        } else {
            return false;
        }

    } catch {
        return false;
    }
}

function TryScan(instance_id, url) {
    return new Promise((resolve) => {
        let target;

        if (filter_url(url)) {
            return resolve();
        }

        try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                target = new URL(url);
            } else {
                target = new URL('http://' + url);
            }

            console.log(chalk.white(`${instance_id} > ${target.href} (${queue.length})`));

            scanUrl(instance_id, target)
                .then(ret => {
                    for (let item of ret[0]) {
                        if (!filter_resource(item)) {
                            queue.push(item);
                        }
                    }
                    for (let key in ret[1]) {
                        const content = ret[1][key];

                        // if (key == 'http://archive.spectator.co.uk/js/jquery.query.js') {
                        //     console.log('!!', key, content);
                        // }
                        patternMatch(key, content)
                            .then(match => {
                                console.log(JSON.stringify(match));
                                if (match === 'found') {
                                    console.log(chalk.green(`${instance_id} > matched at ${target.href} by ${key}`));
                                }
                            });
                    }
                    connection--;
                    resolve();
                });
        } catch (e) {
            console.log(chalk.red(`${instance_id} > ${e.message}`));
        }
    });
}

const instance_status = [];

async function loop(instance_id) {
    if (queue.length == 0) {
        if (instance_status[instance_id] != Instance.SLEEP) {
            instance_status[instance_id] = Instance.SLEEP;
            console.log(chalk.yellow(`${instance_id} > SLEEP`));
        }
        if (instance_status.every(d => d == Instance.SLEEP)) {
            closeBrowser()
                .then(() => {
                    console.log(`TASK DONE`);
                    process.exit();
                })
        }
        delay(1000)
            .then(() => {
                loop(instance_id);
            });
    } else {
        if (instance_status[instance_id] != Instance.WORKING) {
            instance_status[instance_id] = Instance.WORKING;
        }

        connection++;
        TryScan(instance_id, queue.splice(0, 1)[0])
            .then(() => {
                loop(instance_id);
            });
    }
}

for (let i = 1; i <= INSTANCE_SIZE; ++i) {
    loop(i);
}