import yaml
import pymysql

with open("config.yaml", "r") as ymlfile:
    cfg = yaml.safe_load(ymlfile)

    conn = pymysql.connect(
        host = cfg['mysql']['host'],
        port = cfg['mysql']['port'],
        user = cfg['mysql']['user'],
        password = cfg['mysql']['pass'],
        database = cfg['mysql']['database']
    )

cursor = conn.cursor()

lines = open('./domains.csv', 'r').read().split('\n')
idx = 0

for line in lines:
    if idx % 100000 == 0:
        print(idx)
        conn.commit()
    domain = line.split('","')[1]
    cursor.execute('insert into domains values(NULL, "{}", 0, "", 1)'.format(domain))
    idx += 1

conn.commit()
conn.close()