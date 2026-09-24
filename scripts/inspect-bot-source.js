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

function showOccurrences(match) {
  console.log(`\n--- occurrences: ${match} ---`);
  lines.forEach((line, index) => {
    if (line.includes(match)) console.log(`${index + 1}: ${line}`);
  });
}

showAround('function executeForward', 4, 42);
showAround('function loadLevel', 8, 80);
showOccurrences('btn-skip-level');
showOccurrences('gridSize');

const htmlIds = new Set([...source.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
const listeners = [...source.matchAll(/document\.getElementById\(["']([^"']+)["']\)\.addEventListener/g)];
console.log('\n--- direct getElementById(...).addEventListener checks ---');
for (const match of listeners) {
  const line = source.slice(0, match.index).split('\n').length;
  console.log(`${line}: #${match[1]} html-id=${htmlIds.has(match[1]) ? 'present' : 'MISSING'}`);
}
