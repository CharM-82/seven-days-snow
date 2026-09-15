// 《七日回雪》v7 漫画风外围 UI · 主流程
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
  restockShop();
  renderHome();
  navTo('home');
}

function setShell(visible) {
  document.getElementById('app').classList.toggle('in-battle', !visible);
}

function updateShellGold() {
  const el = document.getElementById('shell-gold');
  if (el) el.textContent = '💰 ' + Run.gold;
}

function navTo(screen) {
  setShell(true);
  UI.showScreen(screen);
  document.querySelectorAll('.nav-tab[data-screen]').forEach(t => t.classList.toggle('active', t.dataset.screen === screen));
  document.getElementById('nav-more').classList.remove('active');
  updateShellGold();
}

function goHome() { renderHome(); navTo('home'); }
function showPlay() { if (!Run.classId) { showHeroes(); return; } renderPlay(); navTo('play'); }
function showHeroes() { renderHeroes(); navTo('heroes'); }
function showShop() { if (!Run.classId) { showHeroes(); return; } renderShop(); navTo('shop'); }

function bind() {
  document.querySelectorAll('.nav-tab[data-screen]').forEach(tab => tab.addEventListener('click', () => {
    const s = tab.dataset.screen;
    if (s === 'home') goHome();
    else if (s === 'play') showPlay();
    else if (s === 'heroes') showHeroes();
    else if (s === 'shop') showShop();
  }));

  document.getElementById('nav-more').addEventListener('click', () => {
    document.getElementById('more-drawer').classList.remove('hidden');
  });
  document.getElementById('btn-more-close').addEventListener('click', () => {
    document.getElementById('more-drawer').classList.add('hidden');
  });
  document.querySelector('.more-scrim').addEventListener('click', () => {
    document.getElementById('more-drawer').classList.add('hidden');
  });
  document.querySelectorAll('.more-item').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('more-drawer').classList.add('hidden');
    showComingSoon(btn.dataset.coming);
  }));

  document.getElementById('btn-home-primary').addEventListener('click', () => {
    if (Run.classId) showPlay();
    else showHeroes();
  });
  document.getElementById('btn-home-play').addEventListener('click', showPlay);
  document.getElementById('btn-coming-back').addEventListener('click', goHome);

  document.getElementById('btn-restart').addEventListener('click', goHome);
  document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (UI.isBusy()) return;
    UI.shakeTurnEnd();
    Combat.endTurn();
  });
}

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

// —— 大厅 ——
function renderHome() {
  const cl = Run.classId ? classById(Run.classId) : null;
  document.getElementById('home-hero-emoji').textContent = cl ? cl.icon : '🦸';
  document.getElementById('home-hero-name').textContent = cl ? cl.name : '未选择英雄';
  document.getElementById('home-hero-sub').textContent = cl
    ? (cl.desc + (cl.passive ? ' · ' + cl.passive.name : ''))
    : '选择一位英雄，开始七日预警';
  document.getElementById('btn-home-primary').textContent = cl ? '开始游戏' : '选择英雄';
  updateShellGold();
}

// —— 游戏 / 选关 ——
function renderPlay() {
  const list = document.getElementById('play-list');
  list.innerHTML = NODES.map((n, i) => {
    const isBoss = n.enemyId === 'boss';
    const icon = isBoss ? bossByChapter(1).icon : enemyById(n.enemyId).icon;
    const name = isBoss ? bossByChapter(1).name : enemyById(n.enemyId).name;
    const gold = isBoss ? SHOP.bossGold : SHOP.winGold;
    return '<div class="mode-card comic-panel' + (isBoss ? ' boss' : '') + '" data-idx="' + i + '">'
      + '<div class="mode-icon">' + icon + '</div>'
      + '<div class="mode-info"><div class="mode-name">' + n.label + '</div>'
      + '<div class="mode-meta">' + (isBoss ? 'Boss · ' : '') + name + '</div>'
      + '<div class="mode-reward">胜利 +' + gold + ' 金币</div></div>'
      + '<div class="mode-go">▶</div></div>';
  }).join('');
  list.querySelectorAll('.mode-card').forEach(el => el.addEventListener('click', () => {
    beginBattle(parseInt(el.dataset.idx, 10));
  }));
}

// —— 英雄 ——
function renderHeroes() {
  const list = document.getElementById('hero-list');
  list.innerHTML = CLASSES.map(c =>
    '<div class="hero-card comic-panel" data-id="' + c.id + '">'
    + '<div class="hero-card-icon">' + c.icon + '</div>'
    + '<div class="hero-card-name">' + c.name + '</div>'
    + '<div class="hero-card-desc">' + c.desc + '</div></div>'
  ).join('');
  list.querySelectorAll('.hero-card').forEach(el => el.addEventListener('click', () => {
    list.querySelectorAll('.hero-card').forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
    renderHeroDetail(el.dataset.id);
  }));
  const first = Run.classId || CLASSES[0].id;
  const firstEl = list.querySelector('.hero-card[data-id="' + first + '"]');
  if (firstEl) firstEl.classList.add('selected');
  renderHeroDetail(first);
}

function renderHeroDetail(id) {
  const c = classById(id);
  if (!c) return;
  const cards = c.starterDeck.map(cid => cardById(cid)).filter(Boolean);
  const cardNames = cards.map(k => k.icon + ' ' + k.name).join('、');
  const detail = document.getElementById('hero-detail');
  detail.innerHTML = '<div class="hero-detail-top comic-panel">'
    + '<div class="hd-icon">' + c.icon + '</div>'
    + '<div class="hd-info"><div class="hd-name">' + c.name + '</div>'
    + '<div class="hd-desc">' + c.desc + '</div>'
    + (c.passive ? '<div class="hd-passive">被动：' + c.passive.name + ' · ' + c.passive.desc + '</div>' : '')
    + '</div></div>'
    + '<div class="hero-deck comic-panel"><div class="hd-sub">初始卡组</div><div class="hd-cards">' + cardNames + '</div></div>'
    + '<button class="btn btn-primary comic-btn hd-select" data-id="' + c.id + '">选择出战</button>';
  detail.querySelector('.hd-select').addEventListener('click', () => {
    newRun(id);
    goHome();
  });
}

// —— 开发中 ——
function showComingSoon(name) {
  document.getElementById('coming-title').textContent = name + ' · 开发中';
  document.getElementById('coming-desc').textContent = '该模块将在后续版本开放，敬请期待。';
  navTo('coming');
}

function renderShop() {
  document.getElementById('shop-gold').textContent = Run.gold;
  updateShellGold();
  const packHtml = kind => {
    const available = Run.shop.packs[kind];
    const cost = kind === 'normal' ? SHOP.normalPackCost : kind === 'premium' ? SHOP.premiumPackCost : SHOP.skillPackCost;
    const name = kind === 'normal' ? '普通手卡包' : kind === 'premium' ? '高级手卡包' : '技能卡包';
    const desc = kind === 'skill'
      ? ('开 ' + SHOP.skillPackSize + ' 张技能卡，选 1 张')
      : (kind === 'premium' ? ('开 ' + SHOP.premiumPackSize + ' 张手卡，选 2 张') : ('开 ' + SHOP.normalPackSize + ' 张手卡，选 1 张'));
    return '<div class="pack-btn comic-panel' + (available ? '' : ' disabled') + '" data-pack="' + kind + '"><div class="pb-name">' + name + '</div><div class="pb-desc">' + (available ? desc : '已售空') + '</div><div class="pb-price">' + (available ? (cost + ' 金币') : '—') + '</div></div>';
  };
  document.getElementById('shop-packs').innerHTML =
    '<div class="pack-row">' + packHtml('normal') + packHtml('premium') + packHtml('skill') + '</div>'
    + '<div class="pack-btn comic-panel' + (Run.gold < Run.shop.resetCost ? ' disabled' : '') + '" id="btn-reset-packs"><div class="pb-name">重置卡包</div><div class="pb-desc">恢复 3 个卡包（直购槽不恢复）</div><div class="pb-price">' + Run.shop.resetCost + ' 金币</div></div>';
  document.querySelectorAll('[data-pack]').forEach(el => el.addEventListener('click', () => {
    if (el.classList.contains('disabled')) return;
    buyPack(el.dataset.pack);
  }));
  const resetBtn = document.getElementById('btn-reset-packs');
  resetBtn.addEventListener('click', () => { if (!resetBtn.classList.contains('disabled')) resetShop(); });

  document.getElementById('shop-slots').innerHTML = Run.shop.slots.map((s, i) => {
    if (!s) return '<div class="shop-card comic-panel disabled"><div class="sc-name">已售空</div><div class="sc-desc">—</div></div>';
    return '<div class="shop-card comic-panel" data-idx="' + i + '"><div class="sc-name">' + s.icon + ' ' + s.name + '</div><div class="sc-desc">' + s.desc + '</div><div class="sc-price">' + SHOP.shopCardCost + ' 金币</div></div>';
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
  setShell(false);
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
