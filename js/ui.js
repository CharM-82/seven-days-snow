// 《七日回雪》v4 卡牌原型 · 界面渲染、拖拽出牌与效果动画
'use strict';

const UI = (function () {
  const $ = sel => document.querySelector(sel);
  let lastTurn = 0;
  let inspectIndex = null;
  let inspectTimer = null;
  let drag = null;
  let busy = false;
  let prevState = null;
  let prevHandKey = '';
  let prevHandLen = 0;
  let attackQueue = [];
  let accumDamage = 0;
  let accumMult = 1;
  let settleTimer = null;
  let layoutPending = false;
  let queuePending = false;

  const TURN_START_FX = ['startBlock3', 'startDraw1', 'startEnergy1', 'baseMult1', 'emptySlot', 'gamble'];
  const ON_PLAY_FX = ['randomMult', 'fifth', 'echoLast', 'freeArmor', 'deckDmg', 'decay'];
  const TURN_END_FX = ['reserve', 'retainBlock3'];

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
  }

  function kindOf(card) {
    if (card.type === 'attack') return 'attack';
    if (card.effects && card.effects.some(e => e.type === 'block')) return 'armor';
    return 'action';
  }
  function kindOfEquip(e) {
    if (e.effect === 'startBlock3' || e.effect === 'retainBlock3') return 'armor';
    return 'action';
  }
  function kindLabel(kind) {
    return { attack: '攻击', armor: '护甲', action: '行动' }[kind] || '行动';
  }

  function cardMarkup(c, idx) {
    const kind = kindOf(c);
    return '<div class="card kind-' + kind + '" data-idx="' + idx + '" tabindex="0" aria-label="' + c.name + '：' + c.desc + '">'
      + '<div class="corner-icon">' + c.icon + '</div>'
      + '<div class="cost">' + c.cost + '</div>'
      + '<div class="type-badge ' + kind + '">' + kindLabel(kind) + '</div>'
      + '<div class="c-icon">' + c.icon + '</div>'
      + '<div class="c-name">' + c.name + '</div>'
      + '<div class="c-desc">' + c.desc + '</div>'
      + '</div>';
  }

  function snapshot(S) {
    return { hp: S.player.hp, block: S.player.block, energy: S.player.energy, turnMult: S.turnMult, enemyHp: S.enemy.hp, enemyBlock: S.enemy.block };
  }
  function animateNum(el, from, to, fmt) {
    if (!el) return;
    const dur = 360, start = performance.now();
    function step(ts) {
      const t = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = fmt(v);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function shakeEl(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function wobbleEl(el) { if (!el) return; el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble'); }

  function animateDiffs(prev, S) {
    if (!prev) return;
    if (prev.hp !== S.player.hp) { animateNum($('#bar-hp'), prev.hp, S.player.hp, v => v + '/' + S.player.maxHp); wobbleEl($('#bar-hp')); }
    if (prev.block !== S.player.block) { animateNum($('#bar-block'), prev.block, S.player.block, v => String(v)); wobbleEl($('#bar-block')); }
    if (prev.energy !== S.player.energy) { animateNum($('#bar-energy'), prev.energy, S.player.energy, v => v + '/' + GAME.energy); wobbleEl($('#bar-energy')); }
    if (prev.turnMult !== S.turnMult) { wobbleEl($('#stat-mult')); if (!busy) animateNum($('#score-mult'), prev.turnMult, S.turnMult, v => Math.round(v * 10) / 10); }
  }

  function shakeEquipOnTurn(S) {
    shakeEquipsWith(S, TURN_START_FX);
  }
  function shakeEquipsWith(S, effects) {
    (S.equip || []).forEach((id, i) => {
      const e = id ? skillById(id) : null;
      if (!e) return;
      if (effects.indexOf(e.effect) >= 0) shakeEl($('#equip-' + i));
    });
  }

  function renderBars(S) {
    $('#hp-fill').style.width = Math.max(0, (S.player.hp / S.player.maxHp) * 100) + '%';
    $('#bar-hp').textContent = S.player.hp + '/' + S.player.maxHp;
    $('#block-fill').style.width = Math.min(100, (S.player.block / GAME.blockCap) * 100) + '%';
    $('#bar-block').textContent = S.player.block;
    $('#energy-fill').style.width = Math.min(100, (S.player.energy / GAME.energy) * 100) + '%';
    $('#bar-energy').textContent = S.player.energy + '/' + GAME.energy;
  }

  function renderCombat(S) {
    if (!S) return;
    if (S.turn && S.turn !== lastTurn) { lastTurn = S.turn; prevHandKey = ''; prevHandLen = 0; shakeEquipOnTurn(S); }
    if (prevState && !busy) animateDiffs(prevState, S);

    $('#node-label').textContent = S.node.label + ' · 第 ' + S.turn + ' 回合';
    $('#stat-mult').textContent = '✖ 倍数 ' + (Math.round(S.turnMult * 10) / 10);
    if (!busy) $('#score-mult').textContent = Math.round(S.turnMult * 10) / 10;

    const eIcon = $('#enemy-icon');
    if (S.enemy.icon && S.enemy.icon.endsWith('.svg')) {
      eIcon.innerHTML = '<img class="enemy-emblem" src="' + S.enemy.icon + '" alt="" onerror="this.src=\'assets/bosses/boss-unknown.svg\'">';
    } else {
      eIcon.textContent = S.enemy.icon;
    }
    $('#enemy-name').textContent = S.enemy.name;
    $('#enemy-hp').textContent = S.enemy.hp + '/' + S.enemy.maxHp;
    $('#enemy-hp-fill').style.width = Math.max(0, (S.enemy.hp / S.enemy.maxHp) * 100) + '%';
    $('#enemy-block').textContent = '🛡 ' + S.enemy.block;
    $('#enemy-vuln').classList.toggle('hidden', S.enemy.vuln <= 0);
    const stacksEl = $('#enemy-stacks');
    if (S.enemy.boss) { stacksEl.textContent = '克扣 ' + (S.enemy.stacks || 0); stacksEl.classList.toggle('hidden', (S.enemy.stacks || 0) <= 0); } else { stacksEl.classList.add('hidden'); }
    const buffsEl = $('#boss-buffs');
    if (S.enemy.boss) {
      const buffs = bossBuffs(S.boss.id) || [];
      buffsEl.innerHTML = buffs.map(b => '<span class="boss-buff"><span class="bb-icon">' + b.icon + '</span>' + b.name + '</span>').join('');
      buffsEl.classList.toggle('hidden', buffs.length === 0);
    } else buffsEl.classList.add('hidden');

    const intent = S.enemy.currentIntent;
    if (intent) {
      let txt = '攻击 ' + intent.value;
      if (intent.kind === 'attackVuln') txt = '攻击 ' + intent.value + ' + 易伤';
      if (intent.kind === 'block') txt = '格挡 ' + intent.value;
      $('#enemy-intent').textContent = txt;
    }

    for (let i = 0; i < 3; i++) {
      const slot = $('#equip-' + i);
      const id = S.equip[i];
      const e = id ? skillById(id) : null;
      if (e) { slot.classList.add('filled'); slot.innerHTML = '<div class="eq-name">' + e.icon + ' ' + e.name + '</div><div class="eq-desc">' + e.desc + '</div>'; }
      else { slot.classList.remove('filled'); slot.innerHTML = '技能牌'; }
    }

    renderBars(S);
    syncHand(S);
    renderQueue();

    $('#draw-count').textContent = '牌堆 ' + S.deck.length;
    $('#discard-count').textContent = '弃牌 ' + S.discard.length;
    prevState = snapshot(S);
  }

  function syncHand(S) {
    const key = S.hand.map(c => c.id).join('|');
    const hand = $('#hand');
    if (key !== prevHandKey) {
      buildHand(S, hand);
      prevHandKey = key;
    }
    applyHandState(S, hand);
  }

  function buildHand(S, hand) {
    const newCount = Math.max(0, S.hand.length - prevHandLen);
    hand.classList.toggle('stacked', S.hand.length > 5);
    hand.innerHTML = S.hand.map((c, i) => cardMarkup(c, i)).join('');
    hand.querySelectorAll('.card').forEach(el => {
      const i = parseInt(el.dataset.idx, 10);
      if (newCount > 0 && i >= S.hand.length - newCount) el.classList.add('draw-in');
    });
    layoutHand(hand);
    prevHandLen = S.hand.length;
  }

  function applyHandState(S, hand) {
    hand.querySelectorAll('.card').forEach(el => {
      const i = parseInt(el.dataset.idx, 10);
      const c = S.hand[i];
      if (!c) return;
      el.classList.toggle('disabled', S.over || S.player.energy < Combat.cardCost(c));
      el.classList.toggle('inspect', i === inspectIndex);
    });
  }

  function layoutHand(hand) {
    if (layoutPending) return;
    layoutPending = true;
    requestAnimationFrame(() => {
      layoutPending = false;
      layoutHandNow(hand);
    });
  }
  function layoutHandNow(hand) {
    const cards = hand.querySelectorAll('.card');
    const count = cards.length;
    if (count === 0) return;
    const rect = hand.getBoundingClientRect();
    const gap = 6;
    const maxW = Math.max(60, rect.width - gap * (count - 1));
    const maxH = Math.max(60, rect.height * 0.92);
    let cardW = Math.min(86, maxW / count);
    cardW = Math.max(40, cardW);
    let cardH = Math.min(maxH, cardW / 0.7);
    cardH = Math.max(60, cardH);
    const scale = Math.max(0.6, Math.min(1.4, cardH / 102));
    hand.style.setProperty('--s', scale.toFixed(2));
    cards.forEach(el => { el.style.width = cardW + 'px'; el.style.height = cardH + 'px'; el.style.marginLeft = ''; });
    const needW = count * cardW + gap * (count - 1);
    if (needW > rect.width && count > 1) {
      const overlap = Math.min(cardW * 0.5, (needW - rect.width) / (count - 1));
      cards.forEach((el, i) => { if (i > 0) el.style.marginLeft = (-overlap) + 'px'; });
    }
  }
  function resetTurn() { lastTurn = 0; inspectIndex = null; busy = false; prevState = null; prevHandKey = ''; prevHandLen = 0; attackQueue = []; accumDamage = 0; accumMult = 1; if (settleTimer) clearTimeout(settleTimer); settleTimer = null; }

  function pushLog(kind, text) {
    const list = $('#log-list');
    if (!list) return;
    const line = document.createElement('div');
    line.className = 'log-line ' + kind;
    line.textContent = text;
    list.appendChild(line);
    while (list.children.length > 6) list.firstChild.remove();
    setTimeout(() => line.classList.add('fade'), 1500);
    setTimeout(() => line.remove(), 2200);
  }

  function initInteraction() {
    const hand = $('#hand');
    hand.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function onDown(e) {
    if (busy) return;
    const cardEl = e.target.closest('.card');
    if (!cardEl || cardEl.dataset.idx == null) return;
    const i = parseInt(cardEl.dataset.idx, 10);
    const S = Combat.state();
    if (!S || S.over) return;
    const p = Combat.preview(i);
    if (!p.playable) return;
    drag = { i, startX: e.clientX, startY: e.clientY, moved: false, cardEl };
    cardEl.classList.add('held');
    const ghost = $('#drag-ghost');
    ghost.innerHTML = cardEl.outerHTML;
    ghost.classList.remove('hidden');
    moveGhost(e.clientX, e.clientY);
    e.preventDefault();
  }

  function onMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (dx * dx + dy * dy > 49) drag.moved = true;
    moveGhost(e.clientX, e.clientY);
    $('#combat-zone').classList.toggle('active', !isOverHand(e.clientX, e.clientY));
  }

  function onUp(e) {
    if (!drag) return;
    const overHand = isOverHand(e.clientX, e.clientY);
    $('#combat-zone').classList.remove('active');
    const ghost = $('#drag-ghost');
    ghost.classList.add('hidden');
    ghost.innerHTML = '';
    drag.cardEl.classList.remove('held');
    drag.cardEl.style.opacity = '';
    const i = drag.i;
    const moved = drag.moved;
    drag = null;
    if (!overHand) playDropped(i);
    else if (!moved) inspectCard(i);
  }

  function moveGhost(x, y) {
    const g = $('#drag-ghost');
    g.style.left = x + 'px';
    g.style.top = y + 'px';
  }
  function isOverZone(x, y) {
    const el = document.elementFromPoint(x, y);
    return !!(el && el.closest('#combat-zone'));
  }
  function isOverHand(x, y) {
    const el = document.elementFromPoint(x, y);
    return !!(el && el.closest('#hand-area'));
  }

  function inspectCard(i) {
    inspectIndex = i;
    renderCombat(Combat.state());
    if (inspectTimer) clearTimeout(inspectTimer);
    inspectTimer = setTimeout(() => { inspectIndex = null; renderCombat(Combat.state()); }, 2400);
  }

  // —— 动画辅助 ——
  function rectCenter(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function flyIcon(icon, from, to, duration, onDone) {
    const layer = $('#fx-layer');
    const el = document.createElement('div');
    el.className = 'fx-fly';
    el.textContent = icon;
    el.style.left = from.x + 'px';
    el.style.top = from.y + 'px';
    layer.appendChild(el);
    const dx = to.x - from.x, dy = to.y - from.y;
    const base = 'translate(-50%, -50%)';
    const anim = el.animate([
      { transform: base + ' translate(0,0) scale(1)', opacity: 1 },
      { transform: base + ' translate(' + dx + 'px,' + dy + 'px) scale(1.3)', opacity: 1 }
    ], { duration: duration, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = () => { el.remove(); if (onDone) onDone(); };
  }
  function suckZoneTo(target, duration, onDone) {
    const zone = $('#zone-card');
    if (!zone || target == null) { if (onDone) onDone(); return; }
    const from = rectCenter(zone);
    const to = rectCenter(target);
    const dx = to.x - from.x, dy = to.y - from.y;
    const anim = zone.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.15)', opacity: .2 }
    ], { duration: duration, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = () => { hideZoneCard(); if (onDone) onDone(); };
  }
  function hitEnemyFx() {
    const card = document.querySelector('.enemy-card');
    if (!card) return;
    card.classList.remove('enemy-hit');
    void card.offsetWidth;
    card.classList.add('enemy-hit');
    setTimeout(() => card.classList.remove('enemy-hit'), 380);
  }
  function doHitFlies(card, hits, onDone) {
    let count = 0;
    function next() {
      if (count >= hits) { if (onDone) onDone(); return; }
      count++;
      const from = rectCenter($('#score-dmg'));
      const to = rectCenter($('#enemy-icon'));
      flyIcon(card.icon, from, to, 180, () => { hitEnemyFx(); setTimeout(next, 80); });
    }
    next();
  }
  function showVortex() { const v = $('#score-vortex'); v.classList.remove('hidden'); v.classList.add('active'); }
  function hideVortex() { const v = $('#score-vortex'); v.classList.add('hidden'); v.classList.remove('active'); }
  function targetForSkill(card) {
    if (!card.effects || card.effects.length === 0) return $('#score-mult');
    const e = card.effects[0];
    if (e.type === 'block') return $('#bar-block');
    if (e.type === 'energy') return $('#bar-energy');
    if (e.type === 'heal') return $('#bar-hp');
    if (e.type === 'draw') return $('#draw-count');
    if (e.type === 'multAdd' || e.type === 'multMul') return $('#score-mult');
    return $('#score-mult');
  }

  function renderQueue() {
    if (queuePending) return;
    queuePending = true;
    requestAnimationFrame(() => {
      queuePending = false;
      const el = $('#attack-queue');
      if (!el) return;
      el.innerHTML = attackQueue.map(c => {
        const kind = kindOf(c);
        return '<div class="queue-card kind-' + kind + '">' + c.icon + '<span class="queue-cost">' + c.cost + '</span></div>';
      }).join('');
    });
  }

  function triggerScreenFx(kind) {
    const fx = $('#screen-fx');
    if (!fx) return;
    fx.classList.remove('hidden', 'fx-blue', 'fx-purple');
    if (kind === 'armor') fx.classList.add('fx-blue');
    else if (kind === 'action') fx.classList.add('fx-purple');
    setTimeout(() => { fx.classList.remove('fx-blue', 'fx-purple'); fx.classList.add('hidden'); }, 320);
  }

  function fitScoreNumber(el, base) {
    const len = String(el.textContent || '').length || 1;
    const size = Math.max(10, Math.min(base, Math.floor((base * 3) / len)));
    el.style.fontSize = size + 'px';
  }
  function updateScoreAccum() {
    const dmgEl = $('#score-dmg'), multEl = $('#score-mult'), totalEl = $('#score-total');
    dmgEl.textContent = accumDamage;
    multEl.textContent = accumMult;
    totalEl.textContent = Math.round(accumDamage * accumMult);
    fitScoreNumber(totalEl, 24);
    fitScoreNumber(dmgEl, 16);
    fitScoreNumber(multEl, 16);
    wobbleEl(dmgEl);
    wobbleEl(multEl);
    wobbleEl(totalEl);
  }

  function scheduleSettle() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      if (attackQueue.length === 0) return;
      Combat.settleDamage(accumDamage);
      attackQueue = [];
      accumDamage = 0;
      accumMult = Combat.state().turnMult;
      renderQueue();
      updateScoreAccum();
      renderCombat(Combat.state());
    }, 800);
  }

  function enqueueAttack(i) {
    const taken = Combat.takeCardFromHand(i);
    if (!taken) return;
    attackQueue.push(taken);
    shakeEquipsWith(Combat.state(), ON_PLAY_FX);
    const nums = Combat.attackNumbers(taken);
    accumDamage += nums ? nums.chips : 0;
    accumMult = nums ? nums.mult : Combat.state().turnMult;
    renderQueue();
    updateScoreAccum();
    scheduleSettle();
  }

  function playDropped(i) {
    const S = Combat.state();
    if (!S || S.over) return;
    const card = S.hand[i];
    if (!card) return;

    if (card.type === 'attack') {
      enqueueAttack(i);
    } else {
      busy = true;
      Combat.playCard(i);
      shakeEquipsWith(Combat.state(), ON_PLAY_FX);
      triggerScreenFx(kindOf(card));
      setTimeout(() => { busy = false; }, 180);
    }
  }

  function showZoneCard(card) {
    const el = $('#zone-card');
    el.innerHTML = cardMarkup(card, 0);
    el.classList.remove('hidden');
  }
  function hideZoneCard() {
    $('#zone-card').classList.add('hidden');
    $('#zone-card').innerHTML = '';
  }
  function resetScoreDamage() {
    $('#score-dmg').textContent = '0';
    $('#score-result').textContent = '';
  }

  function animateScoreNums(nums, done) {
    if (!nums) { if (done) done(); return; }
    const dmgEl = $('#score-dmg'), multEl = $('#score-mult'), resEl = $('#score-result');
    resEl.textContent = '';
    const targetChips = nums.chips;
    const targetMult = Math.max(1, nums.mult);
    const targetTotal = nums.total;
    const start = performance.now();
    const dur = 320;
    function step(ts) {
      const t = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      dmgEl.textContent = Math.round(targetChips * eased);
      multEl.textContent = Math.round((1 + (targetMult - 1) * eased) * 10) / 10;
      if (t < 1) requestAnimationFrame(step);
      else { dmgEl.textContent = targetChips; multEl.textContent = targetMult; resEl.textContent = '= ' + targetTotal + ' 总伤害'; if (done) setTimeout(done, 120); }
    }
    requestAnimationFrame(step);
  }

  function isBusy() { return busy || attackQueue.length > 0; }


  function packItemMarkup(item, i) {
    return '<div class="card kind-action" data-idx="' + i + '"><div class="type-badge action">' + (item.damage !== undefined ? '手卡' : '技能卡') + '</div><div class="c-icon">' + item.icon + '</div><div class="c-name">' + item.name + '</div><div class="c-desc">' + item.desc + '</div></div>';
  }

  function showPackModal(title, cards, pickCount, onPick, onCancel) {
    const modal = document.getElementById('modal-reward');
    modal.innerHTML = '<h3>' + title + '</h3><div class="body">点击选择 ' + pickCount + ' 张</div><div class="reward-grid">' + cards.map((item, i) => packItemMarkup(item, i)).join('') + '</div><div class="reward-actions"><button class="btn" id="reward-skip">取消</button></div>';
    modal.classList.remove('hidden');
    const selected = [];
    modal.querySelectorAll('.reward-grid .card').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx, 10);
        const pos = selected.indexOf(idx);
        if (pos >= 0) { selected.splice(pos, 1); el.classList.remove('picked'); }
        else if (selected.length < pickCount) { selected.push(idx); el.classList.add('picked'); }
        if (selected.length === pickCount) { modal.classList.add('hidden'); onPick(selected); }
      });
    });
    modal.querySelector('#reward-skip').addEventListener('click', () => { modal.classList.add('hidden'); if (onCancel) onCancel(); });
  }
  function showReward(type, title, options, skipText, onPick, onSkip) {
    const modal = document.getElementById('modal-reward');
    const cards = options.map((item, i) => {
      if (type === 'card') return cardMarkup(item, i);
      const kind = kindOfEquip(item);
      return '<div class="card kind-' + kind + '" data-idx="' + i + '">'
        + '<div class="type-badge ' + kind + '">' + kindLabel(kind) + '</div>'
        + '<div class="c-icon">' + item.icon + '</div>'
        + '<div class="c-name">' + item.name + '</div>'
        + '<div class="c-desc">' + item.desc + '</div>'
        + '</div>';
    }).join('');
    modal.innerHTML = '<h3>' + title + '</h3>'
      + '<div class="body">点击选择，' + (skipText || '或跳过') + '。</div>'
      + '<div class="reward-grid">' + cards + '</div>'
      + '<div class="reward-actions">'
      + '<button class="btn" id="reward-skip">' + (skipText || '跳过') + '</button>'
      + '</div>';
    modal.classList.remove('hidden');
    modal.querySelectorAll('.reward-grid .card').forEach(el => {
      el.addEventListener('click', () => { modal.classList.add('hidden'); onPick(parseInt(el.dataset.idx, 10)); });
    });
    modal.querySelector('#reward-skip').addEventListener('click', () => { modal.classList.add('hidden'); onSkip(); });
  }

  function showBossDeath(onDone) {
    const el = $('#boss-death');
    el.classList.remove('hidden');
    setTimeout(() => { el.classList.add('hidden'); if (onDone) onDone(); }, 1000);
  }

  function shakeTurnEnd() {
    shakeEquipsWith(Combat.state(), TURN_END_FX);
  }

  function showResult(win, text) {
    $('#result-big').textContent = win ? '🏆' : '❄️';
    $('#result-title').textContent = win ? '守住了临雪市' : '差一点…';
    $('#result-text').textContent = text;
    showScreen('result');
  }

  return {
    showScreen, renderCombat, resetTurn, pushLog, initInteraction, isBusy,
    showReward, showBossDeath, showResult, showPackModal, shakeTurnEnd
  };
})();






































