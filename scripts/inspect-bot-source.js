const fs = require('fs');
const zlib = require('zlib');
const b64 = [1,2,3,4,5,6].map(n=>fs.readFileSync(`data/bot-labyrinth-${n}.txt`,'utf8')).join('').replace(/\s+/g,'');
const lines=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8').split('\n');
function show(start,end){for(let i=start;i<=end;i++) console.log(`${i}: ${lines[i-1]??''}`)}
console.log('--- skip markup ---'); show(405,440);
console.log('--- init tail ---'); show(2645,2835);
