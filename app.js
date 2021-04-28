const fs = require('fs');
const readline = require('readline');
const process = require('process');
const sqlite3 = require('sqlite3');
const chalk = require('chalk');
const { scan, delay } = require('./lib/util');

const db = new sqlite3.Database('./resource/db.sql');
let lastTime = new Date;

(async function loop() {
    try { await db.run('update domains set flag = 0 where flag = 2'); } catch { console.log(chalk.red('[!] Failed to do init query'));  }
    await db.get('select * from domains where flag = 0 limit 1', async (err, res) => {
        if (!res) {
            process.stdout.write('\r');
            if (err) {
                process.stdout.write(chalk.yellow(err.toString().replace('\n', ' ')));
            }
	    process.stdout.write(chalk.yellow('(idle) lastWork -> ' + (lastTime).toLocaleString('en-US')));
            await delay(1000);
        } else {
            const { url } = res;
            let target;

            /* prevent dup */
            db.run('update domains set flag = 2 where url = ?', url);

            try {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    target = new URL(url);
                } else {
                    target = new URL('http://' + url);
                }

                await scan(target);
                db.run('update domains set flag = 1 where url = ?', url);
            } catch (e) {
                console.log(chalk.red('-> ' + e.message));
                db.run('update domains set flag = 3 where url = ?', url);
            }
	    lastTime = new Date;
        }
        loop();
    });
})();
