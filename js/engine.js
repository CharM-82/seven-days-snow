// 《七日回雪》v4 卡牌原型 · 战斗状态机（带事件播报）
'use strict';

const Combat = (function () {
  let S = null;
  let onChange = function () {};
  let onLog = function () {};
  let onEnd = function () {};

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(RNG.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function hasEquip(effect) {
    return (S.equip || []).some(id => id && equipById(id) && equipById(id).effect === effect);
  }
  function hasSkill(effect) {
    return (S.equip || []).some(id => id && skillById(id) && skillById(id).effect === effect);
  }
  function emptySlots() {
    const filled = (S.equip || []).filter(id => id).length;
    return Math.max(0, 3 - filled);
  }
  function cardCost(card) {
    if (hasSkill('freeArmor') && card.effects && card.effects.some(e => e.type === 'block')) return 0;
    return card.cost;
  }
  function currentDecayBonus() {
    return hasSkill('decay') ? Math.max(0, (S.decayBonus || 0)) : 0;
  }
  function pow(kind) {
    return S.powers.reduce((sum, p) => sum + (p.kind === kind ? p.value : 0), 0);
  }
  function computeBaseMult() {
    return GAME.multBase + pow('startMult') + (hasEquip('baseMult1') ? 1 : 0);
  }
  function fmt(v) { return Math.round(v * 10) / 10; }
  function log(kind, text) { onLog(kind, text); }

  function draw(n) {
    while (n > 0) {
      if (S.deck.length === 0) {
        if (S.discard.length === 0) return;
        S.deck = shuffle(S.discard);
        S.discard = [];
      }
      S.hand.push(S.deck.pop());
      n--;
    }
  }

  function bossOnTurnStart() {
    if (!S.boss || !S.enemy.boss) return;
    const d = S.boss.defense;
    if (d && d.every && d.regen && S.turn % d.every === 0) {
      S.enemy.block += d.regen;
      log('boss', S.enemy.name + ' 获得 ' + d.regen + ' 护甲');
    }
  }

  function startTurn() {
    S.turn += 1;
    if (S.classId === 'guardian' && S.turn >= 10) {
      log('player', '绝地反击：撑过10回合，直接获胜！');
      endBattle(true);
      return;
    }
    S.player.vuln = 0;
    S.enemy.vuln = 0;
    S.player.energy = GAME.energy + pow('startEnergy') + (hasEquip('startEnergy1') ? 1 : 0);
    S.baseMult = computeBaseMult();
    S.turnMult = hasSkill('emptySlot') ? emptySlots() : S.baseMult;
    if (hasSkill('gamble')) S.turnMult += 15;
    S.attacksThisTurn = 0;
    S.lastPlayed = null;

    let startBlock = 0;
    if (hasEquip('startBlock3')) startBlock += 3;
    startBlock += pow('startBlock');
    if (startBlock > 0) {
      S.player.block += startBlock;
      log('player', '获得 ' + startBlock + ' 护甲');
    }

    draw(GAME.drawPerTurn);
    let extraDraw = 0;
    if (hasEquip('startDraw1')) extraDraw += 1;
    extraDraw += pow('startDraw');
    if (extraDraw > 0) {
      draw(extraDraw);
      log('player', '额外抽牌 ' + extraDraw + ' 张');
    }

    S.enemy.currentIntent = S.enemy.intents[(S.turn - 1) % S.enemy.intents.length];
    bossOnTurnStart();
    log('info', '第 ' + S.turn + ' 回合');
    emit();
  }

  function hitEnemy(base) {
    let b = base;
    if (hasSkill('deckDmg')) b += 2 * S.deck.length;
    b += currentDecayBonus();
    let raw = Math.round(b * S.turnMult);
    if (S.enemy.vuln > 0) raw = Math.round(raw * 1.5);
    if (S.attacksThisTurn === 0 && hasEquip('firstAttack15')) raw = Math.round(raw * 1.5);
    if (S.enemy.block > 0) {
      const absorbed = Math.min(S.enemy.block, raw);
      S.enemy.block -= absorbed;
      raw -= absorbed;
    }
    if (raw > 0) S.enemy.hp -= raw;
    return Math.max(0, raw);
  }

  function previewEffect(e) {
    switch (e.type) {
      case 'block': return '获得 ' + e.value + ' 护甲';
      case 'draw': return '抽 ' + e.value + ' 张牌';
      case 'energy': return '行动力 +' + e.value;
      case 'heal': return '恢复 ' + e.value + ' 生命';
      case 'multAdd': return '倍数 ' + fmt(S.turnMult) + ' → ' + fmt(S.turnMult + e.value);
      case 'multMul': return '倍数 ' + fmt(S.turnMult) + ' → ' + fmt(S.turnMult * e.value);
      case 'vuln': return '施加 ' + e.value + ' 易伤';
      default: return '';
    }
  }

  function applySkillEffect(e) {
    switch (e.type) {
      case 'block':
        S.player.block += e.value;
        log('player', '获得 ' + e.value + ' 护甲');
        break;
      case 'draw':
        draw(e.value);
        log('player', '抽 ' + e.value + ' 张牌');
        break;
      case 'energy':
        S.player.energy += e.value;
        log('player', '行动力 +' + e.value);
        break;
      case 'heal':
        S.player.hp = Math.min(S.player.maxHp, S.player.hp + e.value);
        log('player', '恢复 ' + e.value + ' 生命');
        break;
      case 'multAdd':
        log('player', '倍数 ' + fmt(S.turnMult) + ' → ' + fmt(S.turnMult + e.value));
        S.turnMult += e.value;
        break;
      case 'multMul':
        log('player', '倍数 ' + fmt(S.turnMult) + ' → ' + fmt(S.turnMult * e.value));
        S.turnMult *= e.value;
        break;
      case 'vuln':
        S.enemy.vuln += e.value;
        log('boss', S.enemy.name + ' 获得 ' + e.value + ' 易伤');
        break;
    }
  }

  function attackNumbers(card) {
    let baseDmg = card.damage;
    if (card.bonus) {
      if (card.bonus.type === 'hpLe' && S.player.hp <= card.bonus.value) baseDmg *= card.bonus.mult;
      if (card.bonus.type === 'attacksThisTurn') baseDmg += card.bonus.per * S.attacksThisTurn;
    }
    if (card._vm) baseDmg = Math.round(baseDmg * card._vm);
    let hits = card.hits || 1;
    if (card.bonus && card.bonus.type === 'multGe' && S.turnMult >= card.bonus.value) hits += (card.bonus.extraHits || 0);
    const chips = baseDmg * hits;
    const total = Math.round(chips * S.turnMult);
    return { chips, hits, mult: S.turnMult, total };
  }

  function preview(i) {
    if (!S || S.over) return { playable: false };
    const card = S.hand[i];
    const cost = card ? cardCost(card) : 999;
    if (!card || S.player.energy < cost) return { playable: false };
    if (card.type === 'power') {
      return { playable: true, kind: 'power', text: '能力：' + card.desc };
    }
    if (card.type === 'attack') {
      const n = attackNumbers(card);
      let text = '基础伤害 ' + n.chips + ' × 倍数 ' + fmt(S.turnMult) + ' = ' + n.total + ' 伤害';
      if (S.enemy.block > 0) text += '；敌方护甲 ' + S.enemy.block + ' 会先抵扣';
      if (card.effects) {
        for (const e of card.effects) {
          const t = previewEffect(e);
          if (t) text += '；' + t;
        }
      }
      return { playable: true, kind: 'attack', text, numbers: n };
    }
    if (card.type === 'skill') {
      const parts = card.effects.map(previewEffect).filter(Boolean);
      return { playable: true, kind: 'skill', text: parts.join('；') };
    }
    return { playable: true, kind: card.type, text: card.desc };
  }

  function bossOnPlayerCard(card) {
    if (!S.boss || !S.enemy.boss) return;
    let add = 1;
    if (card.type === 'attack' && S.boss.antiAttack && S.boss.antiAttack.stack) add += S.boss.antiAttack.stack;
    if (card.type === 'skill' && S.boss.antiSkill && S.boss.antiSkill.stack) add += S.boss.antiSkill.stack;
    S.enemy.stacks += add;
    log('boss', S.enemy.name + ' 获得 ' + add + ' 层克扣');
  }

  function playCard(i) {
    if (S.over) return { played: false, log: '' };
    const card = S.hand[i];
    const cost = card ? cardCost(card) : 999;
    if (!card || S.player.energy < cost) return { played: false, log: '' };
    S.player.energy -= cost;
    S.hand.splice(i, 1);
    S.cardsPlayedThisBattle = (S.cardsPlayedThisBattle || 0) + 1;
    if (hasSkill('randomMult')) { const r = RNG.range(1, 10); S.turnMult += r; log('player', '随机倍率 +' + r); }
    let vm = 1;
    if (hasSkill('fifth') && S.cardsPlayedThisBattle % 5 === 0) { vm *= 4; log('player', '五连击！该牌数值 ×4'); }
    if (S.nextFirstMult > 0) { vm *= S.nextFirstMult; log('player', '蓄势待发：该牌数值 ×' + S.nextFirstMult); S.nextFirstMult = 0; }

    let logText = '';
    if (card.type === 'power') {
      S.powers.push(card.power);
      logText = card.name + '：' + card.desc;
      log('player', logText);
    } else if (card.type === 'attack') {
      let dmg = card.damage;
      if (card.bonus) {
        if (card.bonus.type === 'hpLe' && S.player.hp <= card.bonus.value) dmg *= card.bonus.mult;
        if (card.bonus.type === 'attacksThisTurn') dmg += card.bonus.per * S.attacksThisTurn;
      }
      dmg = Math.round(dmg * vm);
      let hits = card.hits || 1;
      if (card.bonus && card.bonus.type === 'multGe' && S.turnMult >= card.bonus.value) hits += (card.bonus.extraHits || 0);
      let applied = 0;
      for (let h = 0; h < hits; h++) applied += hitEnemy(dmg);
      S.attacksThisTurn += 1;
      if (card.effects) {
        for (const e of card.effects) {
          if (e.type === 'vuln') { S.enemy.vuln += e.value; log('boss', S.enemy.name + ' 获得 ' + e.value + ' 易伤'); }
          else if (e.type === 'draw') { draw(e.value); log('player', '抽 ' + e.value + ' 张牌'); }
        }
      }
      S.discard.push(card);
      logText = card.name + '：造成 ' + applied + ' 伤害';
      log('boss', S.enemy.name + ' 受到 ' + applied + ' 伤害');
    } else if (card.type === 'skill') {
      for (const e of card.effects) {
        const copy = Object.assign({}, e);
        if (vm > 1 && (copy.type === 'block' || copy.type === 'heal' || copy.type === 'multAdd')) copy.value = Math.round(copy.value * vm);
        applySkillEffect(copy);
      }
      S.discard.push(card);
      logText = card.name;
    }

    S.lastPlayed = card;
    if (hasSkill('decay')) { S.decayBonus = Math.max(0, (S.decayBonus || 0) - 5); }
    bossOnPlayerCard(card);

    if (S.enemy.hp <= 0) {
      S.enemy.hp = 0;
      endBattle(true);
    } else {
      emit();
    }
    return { played: true, log: logText };
  }

  function takeCardFromHand(i) {
    if (S.over) return null;
    const card = S.hand[i];
    const cost = card ? cardCost(card) : 999;
    if (!card || S.player.energy < cost) return null;
    S.player.energy -= cost;
    S.hand.splice(i, 1);
    S.cardsPlayedThisBattle = (S.cardsPlayedThisBattle || 0) + 1;
    if (hasSkill('randomMult')) { const r = RNG.range(1, 10); S.turnMult += r; log('player', '随机倍率 +' + r); }
    let vm = 1;
    if (hasSkill('fifth') && S.cardsPlayedThisBattle % 5 === 0) { vm *= 4; log('player', '五连击！该牌数值 ×4'); }
    if (S.nextFirstMult > 0) { vm *= S.nextFirstMult; log('player', '蓄势待发：该牌数值 ×' + S.nextFirstMult); S.nextFirstMult = 0; }
    card._vm = vm;
    S.lastPlayed = card;
    if (hasSkill('decay')) { S.decayBonus = Math.max(0, (S.decayBonus || 0) - 5); }
    emit();
    return card;
  }

  function resolveAttack(card) {
    if (S.over) return { played: false, log: '' };
    let dmg = card.damage;
    if (card.bonus) {
      if (card.bonus.type === 'hpLe' && S.player.hp <= card.bonus.value) dmg *= card.bonus.mult;
      if (card.bonus.type === 'attacksThisTurn') dmg += card.bonus.per * S.attacksThisTurn;
    }
    let hits = card.hits || 1;
    if (card.bonus && card.bonus.type === 'multGe' && S.turnMult >= card.bonus.value) hits += (card.bonus.extraHits || 0);
    let applied = 0;
    for (let h = 0; h < hits; h++) applied += hitEnemy(dmg);
    S.attacksThisTurn += 1;
    if (card.effects) {
      for (const e of card.effects) {
        if (e.type === 'vuln') { S.enemy.vuln += e.value; log('boss', S.enemy.name + ' 获得 ' + e.value + ' 易伤'); }
        else if (e.type === 'draw') { draw(e.value); log('player', '抽 ' + e.value + ' 张牌'); }
      }
    }
    S.discard.push(card);
    bossOnPlayerCard(card);
    if (S.enemy.hp <= 0) {
      S.enemy.hp = 0;
      endBattle(true);
    } else {
      emit();
    }
    return { played: true, log: card.name + '：造成 ' + applied + ' 伤害' };
  }
  function settleDamage(baseDamage) {
    if (S.over) return { played: false, log: '' };
    let b = baseDamage;
    if (hasSkill('deckDmg')) b += 2 * S.deck.length;
    b += currentDecayBonus();
    let raw = Math.round(b * S.turnMult);
    if (S.enemy.vuln > 0) raw = Math.round(raw * 1.5);
    if (S.attacksThisTurn === 0 && hasEquip('firstAttack15')) raw = Math.round(raw * 1.5);
    if (S.enemy.block > 0) {
      const absorbed = Math.min(S.enemy.block, raw);
      S.enemy.block -= absorbed;
      raw -= absorbed;
    }
    if (raw > 0) S.enemy.hp -= raw;
    S.attacksThisTurn += 1;
    if (S.enemy.hp <= 0) {
      S.enemy.hp = 0;
      endBattle(true);
    } else {
      emit();
    }
    return { played: true, log: '造成 ' + Math.max(0, raw) + ' 伤害' };
  }
  function retriggerCard(card) {
    if (!card || S.over) return;
    if (card.type === 'attack') {
      let dmg = card.damage;
      if (card.bonus) {
        if (card.bonus.type === 'hpLe' && S.player.hp <= card.bonus.value) dmg *= card.bonus.mult;
        if (card.bonus.type === 'attacksThisTurn') dmg += card.bonus.per * S.attacksThisTurn;
      }
      let hits = card.hits || 1;
      let applied = 0;
      for (let h = 0; h < hits; h++) applied += hitEnemy(dmg);
      log('boss', '回响：' + card.name + ' 再造成 ' + applied + ' 伤害');
    } else if (card.type === 'skill') {
      for (const e of card.effects) applySkillEffect(e);
      log('player', '回响：' + card.name + ' 效果再触发');
    }
    if (S.enemy.hp <= 0) { S.enemy.hp = 0; endBattle(true); }
  }
  function endTurn() {
    if (S.over) return;
    if (hasSkill('echoLast') && S.lastPlayed) {
      retriggerCard(S.lastPlayed);
      if (S.over) return;
    }
    S.discard = S.discard.concat(S.hand);
    S.hand = [];

    const intent = S.enemy.currentIntent;
    if (intent.kind === 'attack' || intent.kind === 'attackVuln') {
      if (intent.kind === 'attackVuln') {
        S.player.vuln += 1;
        log('boss', S.enemy.name + ' 施加 1 易伤');
      }
      let base = intent.value;
      if (S.boss && S.enemy.boss) {
        base += (S.enemy.stacks || 0);
        S.enemy.stacks = 0;
      }
      let raw = Math.round(base * (S.player.vuln > 0 ? 1.5 : 1));
      const absorbed = Math.min(S.player.block, raw);
      S.player.block -= absorbed;
      raw -= absorbed;
      if (absorbed > 0) log('player', '护甲 -' + absorbed);
      if (raw > 0) S.player.hp -= raw;
      log('boss', S.enemy.name + ' 造成 ' + raw + ' 伤害');
    } else if (intent.kind === 'block') {
      S.enemy.block += intent.value;
      log('boss', S.enemy.name + ' 获得 ' + intent.value + ' 护甲');
    }

    if (hasSkill('gamble') && RNG.next() < (1/6)) {
      const idx = S.equip.findIndex(id => id && skillById(id) && skillById(id).effect === 'gamble');
      if (idx >= 0) { S.equip[idx] = null; log('boss', '豪赌：该技能卡被摧毁！'); }
    }
    if (hasSkill('reserve') && S.player.energy >= 3) {
      S.nextFirstMult = S.player.energy;
      log('player', '蓄势待发：下回合第一张牌 ×' + S.player.energy);
    }
    if (hasEquip('retainBlock3')) {
      S.player.block = Math.min(S.player.block, 3);
    } else {
      S.player.block = 0;
    }

    if (S.player.hp <= 0) {
      S.player.hp = 0;
      endBattle(false);
      return;
    }
    startTurn();
  }

  function endBattle(win) {
    S.win = win;
    S.over = true;
    onEnd(win, S);
  }

  function emit() {
    onChange(S);
  }

  return {
    state: () => S,
    preview,
    attackNumbers,
    takeCardFromHand,
    resolveAttack,
    settleDamage,
    start(nodeOrIndex, deckIds, equip, hp, classId, cbChange, cbLog, cbEnd) {
      let node, chapter;
      if (typeof nodeOrIndex === 'number') {
        node = NODES[nodeOrIndex];
        chapter = GAME.bossChapter;
      } else {
        node = nodeOrIndex;
        chapter = nodeOrIndex.chapter || GAME.bossChapter;
      }
      const isBoss = node && node.enemyId === 'boss';
      const template = isBoss ? bossByChapter(chapter) : enemyById(node.enemyId);
      const hpMult = 1 + (chapter - 1) * 0.35;
      S = {
        nodeIndex: typeof nodeOrIndex === 'number' ? nodeOrIndex : 0,
        node,
        chapter,
        boss: isBoss ? template : null,
        enemy: {
          id: template.id, name: template.name, icon: template.icon,
          hp: Math.round(template.hp * hpMult), maxHp: Math.round(template.hp * hpMult),
          block: isBoss ? (template.startBlock || 0) : 0,
          vuln: 0, boss: isBoss, stacks: 0,
          intents: (isBoss ? template.attack : template.intents).slice(),
          currentIntent: null
        },
        player: { hp: hp, maxHp: GAME.playerHp, block: 0, vuln: 0, energy: 0 },
        deck: shuffle(deckIds.map(cardById).filter(Boolean)),
        hand: [], discard: [], powers: [],
        turn: 0, turnMult: GAME.multBase, baseMult: GAME.multBase, attacksThisTurn: 0,
        cardsPlayedThisBattle: 0, nextFirstMult: 0, lastPlayed: null, decayBonus: 50, classId: classId,
        equip: equip.slice(), over: false, win: false
      };
      onChange = cbChange;
      onLog = cbLog;
      onEnd = cbEnd;
      startTurn();
    },
    playCard,
    cardCost,
    endTurn
  };
})();










if (typeof module !== 'undefined' && module.exports) module.exports = { Combat };
