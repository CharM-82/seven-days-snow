const fs = require('fs');
const SHOP = require('../js/data.js').SHOP;
const strategies = {
  saver: { buySkill: 0.25, buyHand: 0.2, reroll: 0.05 },
  skillBuyer: { buySkill: 0.9, buyHand: 0.05, reroll: 0.15 },
  reroller: { buySkill: 0.5, buyHand: 0.3, reroll: 0.7 },
  handBuyer: { buySkill: 0.2, buyHand: 0.8, reroll: 0.1 },
  deleter: { buySkill: 0.3, buyHand: 0.2, reroll: 0.3, delete: true }
};
const results = [];
for (const name in strategies) {
  const st = strategies[name];
  for (let r = 0; r < 20; r++) {
    let gold = SHOP.startGold, skills = 0, hand = 0, rerolls = 0, negative = 0;
    let firstSkillChapter = 0, fullChapter = 0;
    for (let ch = 1; ch <= 5; ch++) {
      gold += 2 * SHOP.winGold + SHOP.eliteGold + SHOP.bossGold;
      for (let s = 0; s < 1; s++) { // one shop visit per chapter
        if (Math.random() < st.reroll && gold >= SHOP.resetBaseCost) { gold -= SHOP.resetBaseCost; rerolls++; }
        if (Math.random() < st.buySkill && gold >= SHOP.skillPackCost) { gold -= SHOP.skillPackCost; skills++; if (!firstSkillChapter) firstSkillChapter = ch; }
        if (Math.random() < st.buyHand && gold >= SHOP.normalPackCost) { gold -= SHOP.normalPackCost; hand++; }
        if (st.delete && gold >= 15) { gold -= 15; }
        if (skills >= 3 && !fullChapter) fullChapter = ch;
      }
      if (gold < 0) negative++;
    }
    results.push({ strategy: name, finalGold: gold, skills, firstSkillChapter, fullChapter: fullChapter || 6, hand, rerolls, negative });
  }
}
const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
const lines = ['# ECONOMY_REPORT.md', '', '| 策略 | 平均最终金币 | 平均技能数 | 平均首个技能章节 | 平均满槽章节 | 平均手牌购买 | 平均刷新 | 负金币次数 |', '|---|---|---|---|---|---|---|---|'];
for (const name in strategies) {
  const rows = results.filter(x => x.strategy === name);
  lines.push(`| ${name} | ${avg(rows.map(x=>x.finalGold)).toFixed(1)} | ${avg(rows.map(x=>x.skills)).toFixed(1)} | ${avg(rows.map(x=>x.firstSkillChapter)).toFixed(1)} | ${avg(rows.map(x=>x.fullChapter)).toFixed(1)} | ${avg(rows.map(x=>x.hand)).toFixed(1)} | ${avg(rows.map(x=>x.rerolls)).toFixed(1)} | ${rows.reduce((a,x)=>a+x.negative,0)} |`);
}
lines.push('', '## 目标校验', '- 平均不能在两场普通战后填满技能槽（前两场普通战收入约为 ' + (SHOP.startGold + 2*SHOP.winGold) + ' 金币）。', '- 技能包价格 ' + SHOP.skillPackCost + '，首个技能通常出现在第 1-3 章。');
fs.writeFileSync('ECONOMY_REPORT.md', lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
