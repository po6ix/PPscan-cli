const fs = require('fs');
const readline = require('readline');
const process = require('process');
const sqlite3 = require('sqlite3');
const { scan, delay } = require('./lib/util');

const db = new sqlite3.Database('./resource/db.sql');

(async function loop() {
    await db.get('select * from domains where flag = 0 limit 1', async (err, res) => {
        if (!res) {
            if (err) console.log(err);
            console.log(new Date);
            await delay(3000);
        } else {
            const { url } = res;
    
            /* prevent dup */
            db.run('update domains set flag = 1 where url = ?', url);
    
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

        loop();
    });
})();