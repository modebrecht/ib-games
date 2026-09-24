const fs = require('fs');
const zlib = require('zlib');
const b64 = [1,2,3,4,5,6].map(n=>fs.readFileSync(`data/bot-labyrinth-${n}.txt`,'utf8')).join('').replace(/\s+/g,'');
const lines=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8').split('\n');
function showAround(match,before=20,after=35){const i=lines.findIndex(l=>l.includes(match));console.log(`--- ${match} @ ${i+1} ---`);for(let n=Math.max(0,i-before);n<=Math.min(lines.length-1,i+after);n++)console.log(`${n+1}: ${lines[n]}`)}
showAround('id="toast-alert"',35,45);
showAround('id="mission-card"',20,35);
