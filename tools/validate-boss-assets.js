const fs = require('fs');
const path = require('path');
const d = require('../js/data.js');
const emblems = d.BOSSES.map(b => b.emblem).concat(['assets/bosses/boss-unknown.svg']);
let ok = true;
for (const e of emblems) {
  const p = path.join(__dirname, '..', e);
  if (!fs.existsSync(p)) { console.error('MISSING', e); ok = false; continue; }
  const txt = fs.readFileSync(p, 'utf8');
  if (!/viewBox\s*=\s*["']0 0 128 128["']/.test(txt)) { console.error('BAD viewBox', e); ok = false; }
  if (!txt.includes('</title>')) { console.error('NO title', e); ok = false; }
}
console.log(ok ? 'ALL BOSS ASSETS OK' : 'BOSS ASSETS ERROR');
process.exit(ok ? 0 : 1);
