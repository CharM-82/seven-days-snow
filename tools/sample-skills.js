const d = require('../js/data.js');
const R = require('../js/rng.js');
R.RNG.seed(20260916);
const pool = d.weightedSkillPool();
const total = pool.reduce((a, b) => a + b.weight, 0);
const counts = {};
for (let i = 0; i < 100000; i++) {
  let r = R.RNG.next() * total;
  let pick = pool[pool.length - 1];
  for (const p of pool) { r -= p.weight; if (r <= 0) { pick = p; break; } }
  const skill = d.skillById(pick.id);
  const k = skill.rarity;
  counts[k] = (counts[k] || 0) + 1;
  counts['skill:' + skill.id] = (counts['skill:' + skill.id] || 0) + 1;
}
const special = d.ALL_SKILL_CARDS.filter(s => s.rarity === 'special').map(s => s.id);
const high = special;
console.log('quality distribution', Object.keys(counts).filter(k => !k.startsWith('skill:')).map(k => k + ':' + (counts[k]/1000).toFixed(2) + '%').join(' '));
console.log('special single-card rates');
for (const id of high) console.log(id, (counts['skill:' + id]/1000).toFixed(3) + '%');
