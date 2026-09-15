// 《七日回雪》v10 五章路线 · 主流程
'use strict';

const SAVE_KEY = 'qirihui-run';

let Run = {
  classId: null,
  deck: [],
  equip: [null, null, null],
  hp: GAME.playerHp,
  gold: SHOP.startGold,
  chapter: 1,
  nodeIndex: 0,
  route: null,
  seed: null,
  shop: null
};

function shuffle(arr) { return RNG.shuffle(arr); }
function sample(arr, n) { return RNG.shuffle(arr).slice(0, n); }

function init() {
  bind();
  UI.initInteraction();
  const saved = loadRun();
  if (saved) {
    Run = Object.assign({}, Run, saved);
    if (!Run.route && Run.chapter) Run.route = chapterById(Run.chapter).nodes;
  }
  if (!Run.shop) restockShop();
  if (!Run.seed) Run.seed = RNG.seed(Date.now());
  renderHome();
  navTo('home');
  if (typeof validateData === 'function') validateData();
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
function goMapOrHome() {
  if (Run.classId && Run.route) { renderPlay(); navTo('play'); }
  else goHome();
}
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
  document.getElementById('btn-restart').addEventListener('click', goMapOrHome);
  document.getElementById('btn-shop-done').addEventListener('click', () => {
    advanceNode();
    goMapOrHome();
  });
  document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (UI.isBusy()) return;
    UI.shakeTurnEnd();
    Combat.endTurn();
  });
}

// —— 存档 ——
function saveRun() {
  const data = {
    classId: Run.classId, deck: Run.deck, equip: Run.equip, hp: Run.hp,
    gold: Run.gold, chapter: Run.chapter, nodeIndex: Run.nodeIndex,
    route: Run.route, seed: Run.seed, shop: Run.shop
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}
function loadRun() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.classId) return data;
  } catch (e) {}
  return null;
}
function clearRun() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// —— 新局 ——
function newRun(classId) {
  Run.classId = classId;
  Run.deck = classById(classId).starterDeck.slice();
  Run.equip = [null, null, null];
  Run.hp = GAME.playerHp;
  Run.gold = SHOP.startGold;
  Run.chapter = 1;
  Run.nodeIndex = 0;
  Run.route = chapterById(1).nodes;
  Run.seed = RNG.seed(Date.now());
  restockShop();
  saveRun();
}

function restockShop() {
  Run.shop = {
    packs: { normal: true, premium: true, skill: true },
    slots: sample(skillPool(), 3),
    resetCost: SHOP.resetBaseCost
  };
}

// —— 大厅 ——
function renderHome() {
  const cl = Run.classId ? classById(Run.classId) : null;
  document.getElementById('home-hero-emoji').textContent = cl ? cl.icon : '🦸';
  document.getElementById('home-hero-name').textContent = cl ? cl.name : '未选择英雄';
  document.getElementById('home-hero-sub').textContent = cl
    ? (cl.desc + (cl.passive ? ' · ' + cl.passive.name : ''))
    : '选择一位英雄，开始七日预警';
  document.getElementById('btn-home-primary').textContent = cl ? '继续闯关' : '选择英雄';
  updateShellGold();
}

// —— 五章路线地图 ——
function renderPlay() {
  const list = document.getElementById('play-list');
  const chapter = chapterById(Run.chapter);
  const route = Run.route || chapter.nodes;
  const pageHead = document.querySelector('#screen-play .page-head');
  if (pageHead) pageHead.innerHTML = '<h2>' + chapter.name + '</h2><p>种子 ' + Run.seed + ' · 第 ' + (Run.nodeIndex + 1) + '/' + route.length + ' 节点</p>';

  list.innerHTML = route.map((n, i) => {
    const done = i < Run.nodeIndex;
    const current = i === Run.nodeIndex;
    const locked = i > Run.nodeIndex;
    let icon, name, meta, reward;
    if (n.type === 'battle' || n.type === 'elite') {
      icon = enemyById(n.enemyId).icon;
      name = n.label;
      meta = n.type === 'elite' ? '精英 · ' + enemyById(n.enemyId).name : enemyById(n.enemyId).name;
      reward = '胜利 +' + (n.type === 'elite' ? 70 : SHOP.winGold) + ' 金币';
    } else if (n.type === 'shop') {
      icon = '🛒'; name = n.label; meta = '购买卡牌与技能'; reward = '补给';
    } else if (n.type === 'rest') {
      icon = '🏕️'; name = n.label; meta = '恢复生命'; reward = '+15 生命';
    } else {
      icon = bossByChapter(Run.chapter).icon; name = n.label; meta = 'Boss · ' + bossByChapter(Run.chapter).name; reward = '胜利 +' + SHOP.bossGold + ' 金币';
    }
    return '<div class="mode-card comic-panel' + (n.type === 'boss' ? ' boss' : '') + (done ? ' done' : '') + (current ? ' current' : '') + (locked ? ' locked' : '') + '" data-idx="' + i + '">'
      + '<div class="mode-icon">' + icon + '</div>'
      + '<div class="mode-info"><div class="mode-name">' + (done ? '✓ ' : '') + name + '</div>'
      + '<div class="mode-meta">' + meta + '</div>'
      + '<div class="mode-reward">' + reward + '</div></div>'
      + '<div class="mode-go">' + (locked ? '🔒' : '▶') + '</div></div>';
  }).join('');

  list.querySelectorAll('.mode-card').forEach(el => {
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.idx, 10);
      if (i !== Run.nodeIndex) return;
      enterNode(i);
    });
  });
}

function enterNode(i) {
  const node = Run.route[i];
  if (!node) return;
  if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
    beginBattle(node);
  } else if (node.type === 'shop') {
    renderShop();
    const done = document.getElementById('btn-shop-done');
    done.classList.remove('hidden');
    navTo('shop');
  } else if (node.type === 'rest') {
    Run.hp = Math.min(GAME.playerHp, Run.hp + 15);
    UI.pushLog('player', '休整：生命 +15');
    advanceNode();
    renderPlay();
  }
}

function advanceNode() {
  Run.nodeIndex += 1;
  if (Run.nodeIndex >= Run.route.length) {
    nextChapter();
  }
  saveRun();
}

function nextChapter() {
  if (Run.chapter >= 5) {
    // 通关在 onBattleEnd 中处理
    Run.chapter = 5;
    Run.nodeIndex = Run.route.length - 1;
    return;
  }
  Run.chapter += 1;
  Run.nodeIndex = 0;
  Run.route = chapterById(Run.chapter).nodes;
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

// —— 商城 ——
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

  const doneBtn = document.getElementById('btn-shop-done');
  if (doneBtn) {
    const inShopNode = Run.route && Run.route[Run.nodeIndex] && Run.route[Run.nodeIndex].type === 'shop';
    doneBtn.classList.toggle('hidden', !inShopNode);
  }
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
    saveRun();
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
  saveRun();
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

// —— 战斗 ——
function beginBattle(node) {
  setShell(false);
  UI.showScreen('run');
  UI.resetTurn();
  Combat.start(Object.assign({}, node, { chapter: Run.chapter }), Run.deck, Run.equip, Run.hp, Run.classId,
    S => UI.renderCombat(S),
    (kind, text) => UI.pushLog(kind, text),
    onBattleEnd
  );
}

function onBattleEnd(win, S) {
  Run.hp = S.player.hp;
  if (!win) {
    document.getElementById('result-big').textContent = '❄️';
    document.getElementById('result-title').textContent = '差一点…';
    document.getElementById('result-text').textContent = '再试一次，或返回大厅重新构筑。';
    document.getElementById('btn-restart').textContent = '返回大厅';
    UI.showScreen('result');
    return;
  }

  const node = Run.route[Run.nodeIndex];
  const gold = node.type === 'boss' ? SHOP.bossGold : node.type === 'elite' ? 70 : SHOP.winGold;
  Run.gold += gold;
  restockShop();

  if (node.type === 'boss' && Run.chapter >= 5) {
    document.getElementById('result-big').textContent = '🏆';
    document.getElementById('result-title').textContent = '通关！';
    document.getElementById('result-text').textContent = '你走完了五章，获得 ' + gold + ' 金币。';
    document.getElementById('btn-restart').textContent = '返回大厅';
    UI.showScreen('result');
    clearRun();
    return;
  }

  advanceNode();
  document.getElementById('result-big').textContent = node.type === 'boss' ? '🏁' : '✅';
  document.getElementById('result-title').textContent = node.type === 'boss' ? '章节完成' : '战斗胜利';
  document.getElementById('result-text').textContent = '获得 ' + gold + ' 金币，商店已重新补货。';
  document.getElementById('btn-restart').textContent = '继续';
  UI.showScreen('result');
}

document.addEventListener('DOMContentLoaded', init);
