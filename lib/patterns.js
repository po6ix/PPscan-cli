const fs = require('fs');

const chunk = fs.readFileSync('./resource/pattern.csv').toString();
const Patterns = chunk
    .split("\n")
    .map((line) => {
        line = line.trim();

        if (line.startsWith("#") || line == "") {
            return;
        }

        let data = line.split("|");
        let name, type, chunk;

        name = data[0].trim();
        type = data[1].trim();
        chunk = data.slice(2).join("|").trim();

        return { name, type, chunk };
    })
    .filter((notnull) => notnull);

module.exports = {
    Patterns
};