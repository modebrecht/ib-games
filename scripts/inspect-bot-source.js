const fs = require('fs');
const zlib = require('zlib');

const b64 = [1, 2, 3, 4, 5, 6]
  .map(n => fs.readFileSync(`data/bot-labyrinth-${n}.txt`, 'utf8'))
  .join('')
  .replace(/\s+/g, '');
const source = zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
const lines = source.split('\n');

function showAround(match, before = 6, after = 24) {
  const index = lines.findIndex(line => line.includes(match));
  console.log(`\n--- ${match} @ source line ${index + 1} ---`);
  for (let i = Math.max(0, index - before); i <= Math.min(lines.length - 1, index + after); i += 1) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

showAround('const LEVELS =', 0, 100);
showAround('function updateClassroomChrome', 4, 55);
showAround("document.getElementById('btn-play').addEventListener", 12, 35);
showAround('function resetBot', 3, 35);
showAround('const AppState =', 0, 55);
