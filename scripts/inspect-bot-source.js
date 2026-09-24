const fs = require('fs');
const zlib = require('zlib');

const b64 = [1, 2, 3, 4, 5, 6]
  .map(n => fs.readFileSync(`data/bot-labyrinth-${n}.txt`, 'utf8'))
  .join('')
  .replace(/\s+/g, '');
const source = zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
const lines = source.split('\n');

for (const [start, end] of [[1678, 1694], [2054, 2068]]) {
  console.log(`\n--- Bot source ${start}-${end} ---`);
  for (let line = start; line <= end; line += 1) {
    console.log(`${line}: ${lines[line - 1] ?? ''}`);
  }
}
