// 《七日回雪》v5 大厅/商店/关卡选择 · 主流程
'use strict';

let Run = {
  classId: null,
  deck: [],
  equip: [null, null, null],
  hp: GAME.playerHp,
  gold: SHOP.startGold,
  node: 0,
  shop: null
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, n); }

function init() {
  bind();
  UI.initInteraction();
  showMenu();
}

function bind() {
  document.getElementById('btn-start').addEventListener('click', goLobby);
  document.getElementById('btn-choose-class').addEventListener('click', showClasses);
  document.getElementById('btn-levels').addEventListener('click', showLevels);
  document.getElementById('btn-shop').addEventListener('click', showShop);
  document.getElementById('btn-back-menu').addEventListener('click', showMenu);
  document.getElementById('btn-classes-back').addEventListener('click', goLobby);
  document.getElementById('btn-levels-back').addEventListener('click', goLobby);
  document.getElementById('btn-shop-back').addEventListener('click', goLobby);
  document.getElementById('btn-restart').addEventListener('click', goLobby);
  document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (UI.isBusy()) return;
    UI.shakeTurnEnd();
    Combat.endTurn();
  });
}

function showMenu() { UI.showScreen('menu'); }

function restockShop() {
  Run.shop = {
    packs: { normal: true, premium: true, skill: true },
    slots: sample(skillPool(), 3),
    resetCost: SHOP.resetBaseCost
  };
}

function newRun(classId) {
  Run.classId = classId;
  Run.deck = classById(classId).starterDeck.slice();
  Run.equip = [null, null, null];
  Run.hp = GAME.playerHp;
  Run.gold = SHOP.startGold;
  restockShop();
}

function goLobby() {
  if (!Run.classId) { showClasses(); return; }
  renderLobby();
  UI.showScreen('lobby');
}

function renderLobby() {
  document.getElementById('lobby-gold').textContent = Run.gold;
  const cl = Run.classId ? classById(Run.classId) : null;
  document.getElementById('lobby-class').textContent = cl
    ? ('职业：' + cl.name + (cl.passive ? '（' + cl.passive.name + '）' : ''))
    : '职业：未选择';
}

function showClasses() {
  const list = document.getElementById('class-list');
  list.innerHTML = CLASSES.map(c =>
    '<div class="class-card" data-id="' + c.id + '"><div class="cc-icon">' + c.icon + '</div><div class="cc-name">' + c.name + '</div><div class="cc-desc">' + c.desc + '</div></div>'
  ).join('');
  list.querySelectorAll('.class-card').forEach(el => el.addEventListener('click', () => {
    newRun(el.dataset.id);
    goLobby();
  }));
  UI.showScreen('classes');
}

function showLevels() {
  const list = document.getElementById('level-list');
  list.innerHTML = NODES.map((n, i) =>
    '<div class="level-card" data-idx="' + i + '"><div class="lc-icon">' + (n.enemyId === 'boss' ? '🏢' : enemyById(n.enemyId).icon) + '</div><div class="lc-name">' + n.label + '</div><div class="lc-desc">难度 ' + (i + 1) + (n.enemyId === 'boss' ? ' · Boss' : '') + '</div></div>'
  ).join('');
  list.querySelectorAll('.level-card').forEach(el => el.addEventListener('click', () => {
    beginBattle(parseInt(el.dataset.idx, 10));
  }));
  UI.showScreen('levels');
}

function showShop() { renderShop(); UI.showScreen('shop'); }

function renderShop() {
  document.getElementById('shop-gold').textContent = Run.gold;
  const packHtml = kind => {
    const available = Run.shop.packs[kind];
    const cost = kind === 'normal' ? SHOP.normalPackCost : kind === 'premium' ? SHOP.premiumPackCost : SHOP.skillPackCost;
    const name = kind === 'normal' ? '普通手卡包' : kind === 'premium' ? '高级手卡包' : '技能卡包';
    const desc = kind === 'skill'
      ? ('开 ' + SHOP.skillPackSize + ' 张技能卡，选 1 张')
      : (kind === 'premium' ? ('开 ' + SHOP.premiumPackSize + ' 张手卡，选 2 张') : ('开 ' + SHOP.normalPackSize + ' 张手卡，选 1 张'));
    return '<div class="pack-btn' + (available ? '' : ' disabled') + '" data-pack="' + kind + '"><div class="pb-name">' + name + '</div><div class="pb-desc">' + (available ? desc : '已售空') + '</div><div class="pb-price">' + (available ? (cost + ' 金币') : '—') + '</div></div>';
  };
  document.getElementById('shop-packs').innerHTML =
    '<div class="pack-row">' + packHtml('normal') + packHtml('premium') + packHtml('skill') + '</div>' +
    '<div class="pack-btn' + (Run.gold < Run.shop.resetCost ? ' disabled' : '') + '" id="btn-reset-packs"><div class="pb-name">重置卡包</div><div class="pb-desc">恢复 3 个卡包（直购槽不恢复）</div><div class="pb-price">' + Run.shop.resetCost + ' 金币</div></div>';
  document.querySelectorAll('[data-pack]').forEach(el => el.addEventListener('click', () => {
    if (el.classList.contains('disabled')) return;
    buyPack(el.dataset.pack);
  }));
  const resetBtn = document.getElementById('btn-reset-packs');
  resetBtn.addEventListener('click', () => { if (!resetBtn.classList.contains('disabled')) resetShop(); });

  document.getElementById('shop-slots').innerHTML = Run.shop.slots.map((s, i) => {
    if (!s) return '<div class="shop-card disabled"><div class="sc-name">已售空</div><div class="sc-desc">—</div></div>';
    return '<div class="shop-card" data-idx="' + i + '"><div class="sc-name">' + s.icon + ' ' + s.name + '</div><div class="sc-desc">' + s.desc + '</div><div class="sc-price">' + SHOP.shopCardCost + ' 金币</div></div>';
  }).join('');
  document.querySelectorAll('#shop-slots .shop-card[data-idx]').forEach(el => el.addEventListener('click', () => {
    buyShopSlot(parseInt(el.dataset.idx, 10));
  }));
}

function buyPack(kind) {
  if (!Run.shop.packs[kind]) return;
  let cost, size, pick, pool, title, isSkill;
  if (kind === 'normal') { cost = SHOP.normalPackCost; size = SHOP.normalPackSize; pick = 1; pool = handPool(); title = '普通手卡包（选 1 张）'; isSkill = false; }
  else if (kind === 'premium') { cost = SHOP.premiumPackCost; size = SHOP.premiumPackSize; pick = 2; pool = handPool(); title = '高级手卡包（选 2 张）'; isSkill = false; }
  else { cost = SHOP.skillPackCost; size = SHOP.skillPackSize; pick = 1; pool = skillPool(); title = '技能卡包（选 1 张）'; isSkill = true; }
  if (Run.gold < cost) return;
  Run.gold -= cost;
  Run.shop.packs[kind] = false;
  const cards = sample(pool, size);
  UI.showPackModal(title, cards, pick, idxs => {
    for (const i of idxs) {
      if (isSkill) addSkill(cards[i].id);
      else Run.deck.push(cards[i].id);
    }
    renderShop();
  }, () => { Run.gold += cost; Run.shop.packs[kind] = true; renderShop(); });
}

function buyShopSlot(i) {
  const skill = Run.shop.slots[i];
  if (!skill) return;
  if (Run.gold < SHOP.shopCardCost) return;
  Run.gold -= SHOP.shopCardCost;
  Run.shop.slots[i] = null;
  addSkill(skill.id);
  renderShop();
}

function resetShop() {
  if (Run.gold < Run.shop.resetCost) return;
  Run.gold -= Run.shop.resetCost;
  Run.shop.packs = { normal: true, premium: true, skill: true };
  Run.shop.resetCost += SHOP.resetCostStep;
  renderShop();
}

function addSkill(id) {
  const slot = Run.equip.indexOf(null);
  if (slot >= 0) Run.equip[slot] = id;
}

function beginBattle(nodeIndex) {
  Run.node = nodeIndex;
  UI.showScreen('run');
  UI.resetTurn();
  Combat.start(nodeIndex, Run.deck, Run.equip, Run.hp, Run.classId,
    S => UI.renderCombat(S),
    (kind, text) => UI.pushLog(kind, text),
    onBattleEnd
  );
}

function onBattleEnd(win, S) {
  Run.hp = S.player.hp;
  if (win) {
    const gold = Run.node === 3 ? SHOP.bossGold : SHOP.winGold;
    Run.gold += gold;
    restockShop();
    if (Run.node === 3) {
      UI.showBossDeath(() => {
        document.getElementById('result-big').textContent = '🏆';
        document.getElementById('result-title').textContent = '通关！';
        document.getElementById('result-text').textContent = '你击败了物业经理，获得 ' + gold + ' 金币。';
        document.getElementById('btn-restart').textContent = '返回大厅';
        UI.showScreen('result');
      });
    } else {
      document.getElementById('result-big').textContent = '✅';
      document.getElementById('result-title').textContent = '战斗胜利';
      document.getElementById('result-text').textContent = '获得 ' + gold + ' 金币，商店已重新补货。';
      document.getElementById('btn-restart').textContent = '返回大厅';
      UI.showScreen('result');
    }
  } else {
    document.getElementById('result-big').textContent = '❄️';
    document.getElementById('result-title').textContent = '差一点…';
    document.getElementById('result-text').textContent = '再试一次。';
    document.getElementById('btn-restart').textContent = '返回大厅';
    UI.showScreen('result');
  }
}

document.addEventListener('DOMContentLoaded', init);
