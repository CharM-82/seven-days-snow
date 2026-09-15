// 《七日回雪》v3 卡牌原型 · 数据配置（数值集中在此便于调参）
'use strict';

const GAME = {
  playerHp: 60,
  energy: 3,
  handSize: 5,
  drawPerTurn: 5,
  multBase: 1,
  blockCap: 20,
  bossChapter: 1
};

const CARDS = [
  // 初始牌组
  { id: 'pick', name: '破冰镐', type: 'attack', cost: 1, icon: '⛏️', desc: '造成 6 基础伤害', damage: 6, hits: 1, starter: true },
  { id: 'wrap', name: '御寒裹紧', type: 'skill', cost: 1, icon: '🧥', desc: '获得 5 护甲', effects: [{ type: 'block', value: 5 }], starter: true },
  { id: 'ration', name: '应急口粮', type: 'skill', cost: 0, icon: '🍫', desc: '抽 1 张牌', effects: [{ type: 'draw', value: 1 }], starter: true },
  { id: 'stock', name: '清点物资', type: 'skill', cost: 0, icon: '📦', desc: '本回合 倍数 +1', effects: [{ type: 'multAdd', value: 1 }], starter: true },
  { id: 'expose', name: '当众揭发', type: 'attack', cost: 1, icon: '📢', desc: '造成 5 伤害，施加 1 易伤', damage: 5, hits: 1, effects: [{ type: 'vuln', value: 1 }], starter: true },

  // 奖励攻击牌
  { id: 'boots', name: '雪地靴', type: 'attack', cost: 0, icon: '🥾', desc: '造成 3 基础伤害', damage: 3, hits: 1 },
  { id: 'icicle', name: '冰锥连击', type: 'attack', cost: 1, icon: '🧊', desc: '造成 3 伤害，命中 2 次', damage: 3, hits: 2 },
  { id: 'hammer', name: '破拆锤', type: 'attack', cost: 2, icon: '🔨', desc: '造成 12 基础伤害', damage: 12, hits: 1 },
  { id: 'iceblade', name: '冰刃', type: 'attack', cost: 1, icon: '❄️', desc: '造成 7 伤害；倍数≥4 再命中 1 次', damage: 7, hits: 1, bonus: { type: 'multGe', value: 4, extraHits: 1 } },
  { id: 'chain', name: '证据链', type: 'attack', cost: 1, icon: '🔗', desc: '造成 6 伤害，抽 1 张牌', damage: 6, hits: 1, effects: [{ type: 'draw', value: 1 }] },
  { id: 'allin', name: '破釜沉舟', type: 'attack', cost: 2, icon: '💥', desc: '造成 9 伤害；生命≤30 时基础伤害×2', damage: 9, hits: 1, bonus: { type: 'hpLe', value: 30, mult: 2 } },
  { id: 'ace', name: '终极底牌', type: 'attack', cost: 3, icon: '🃏', desc: '造成 8 伤害；本回合每打出过 1 张攻击 +4', damage: 8, hits: 1, bonus: { type: 'attacksThisTurn', per: 4 } },

  // 奖励技能牌
  { id: 'gen', name: '柴油发电机', type: 'skill', cost: 1, icon: '⚡', desc: '获得 1 行动力', effects: [{ type: 'energy', value: 1 }] },
  { id: 'layer', name: '加厚保温层', type: 'skill', cost: 1, icon: '🧵', desc: '获得 8 护甲', effects: [{ type: 'block', value: 8 }] },
  { id: 'list', name: '物资清单', type: 'skill', cost: 0, icon: '📋', desc: '本回合 倍数 +2', effects: [{ type: 'multAdd', value: 2 }] },
  { id: 'huddle', name: '抱团取暖', type: 'skill', cost: 1, icon: '🤝', desc: '本回合 倍数 ×2', effects: [{ type: 'multMul', value: 2 }] },
  { id: 'rush', name: '雪夜急行', type: 'skill', cost: 0, icon: '🌨️', desc: '抽 2 张牌', effects: [{ type: 'draw', value: 2 }] },
  { id: 'soup', name: '热汤', type: 'skill', cost: 1, icon: '🍲', desc: '恢复 5 生命', effects: [{ type: 'heal', value: 5 }] },
  { id: 'unity', name: '团结互助', type: 'skill', cost: 1, icon: '🫂', desc: '倍数 ×1.5，获得 4 护甲', effects: [{ type: 'multMul', value: 1.5 }, { type: 'block', value: 4 }] },
  { id: 'torch', name: '火炬', type: 'skill', cost: 1, icon: '🔥', desc: '本回合 倍数 +3', effects: [{ type: 'multAdd', value: 3 }] },

  // 能力牌
  { id: 'avalanche', name: '雪崩预警', type: 'power', cost: 2, icon: '🚨', desc: '每回合开始 倍数 +1', power: { kind: 'startMult', value: 1 } },
  { id: 'thermo', name: '恒温系统', type: 'power', cost: 2, icon: '🌡️', desc: '每回合开始获得 4 护甲', power: { kind: 'startBlock', value: 4 } },
  { id: 'battery', name: '备用电源', type: 'power', cost: 1, icon: '🔋', desc: '每回合开始获得 1 行动力', power: { kind: 'startEnergy', value: 1 } },
  { id: 'network', name: '情报网', type: 'power', cost: 1, icon: '📡', desc: '每回合开始抽 1 张牌', power: { kind: 'startDraw', value: 1 } },

  // 破冰者普通基础手牌
  { id: 'bs-strike', name: '碎冰斩', type: 'attack', cost: 1, icon: '🪓', desc: '造成 6 点伤害', damage: 6, hits: 1, starter: true, cardFamily: 'basic-hand', classId: 'breaker' },
  { id: 'bs-frost', name: '寒霜回旋', type: 'attack', cost: 1, icon: '❄️', desc: '造成 3 点伤害，命中 2 次', damage: 3, hits: 2, starter: true, cardFamily: 'basic-hand', classId: 'breaker' },
  { id: 'bs-block', name: '冰壳', type: 'skill', cost: 1, icon: '🧊', desc: '获得 5 点护甲', effects: [{ type: 'block', value: 5 }], starter: true, cardFamily: 'basic-hand', classId: 'breaker' },
  { id: 'bs-overpower', name: '破冰突进', type: 'attack', cost: 2, icon: '💥', desc: '造成 10 点伤害', damage: 10, hits: 1, starter: true, cardFamily: 'basic-hand', classId: 'breaker' },

  // 守望者普通基础手牌
  { id: 'sn-shield', name: '盾击', type: 'attack', cost: 1, icon: '🛡️', desc: '造成 4 点伤害', damage: 4, hits: 1, starter: true, cardFamily: 'basic-hand', classId: 'guardian' },
  { id: 'sn-fortify', name: '坚守阵线', type: 'skill', cost: 1, icon: '🏰', desc: '获得 7 点护甲', effects: [{ type: 'block', value: 7 }], starter: true, cardFamily: 'basic-hand', classId: 'guardian' },
  { id: 'sn-rally', name: '战场号令', type: 'skill', cost: 1, icon: '📣', desc: '获得 1 点行动力，抽 1 张牌', effects: [{ type: 'energy', value: 1 }, { type: 'draw', value: 1 }], starter: true, cardFamily: 'basic-hand', classId: 'guardian' },
  { id: 'sn-comeback', name: '守势反击', type: 'attack', cost: 2, icon: '🔥', desc: '造成 8 点伤害；生命≤30 时基础伤害×2', damage: 8, hits: 1, bonus: { type: 'hpLe', value: 30, mult: 2 }, starter: true, cardFamily: 'basic-hand', classId: 'guardian' }
];

const EQUIPMENTS = [
  { id: 'quilt', name: '旧棉被', icon: '🛏️', desc: '每回合开始护甲 +3', effect: 'startBlock3' },
  { id: 'heater', name: '热力贴', icon: '♨️', desc: '每回合开始 倍数 +1', effect: 'baseMult1' },
  { id: 'radio', name: '对讲机', icon: '📻', desc: '每回合开始抽 1 张牌', effect: 'startDraw1' },
  { id: 'gen2', name: '备用发电机', icon: '⚙️', desc: '每回合开始行动力 +1', effect: 'startEnergy1' },
  { id: 'tent', name: '保温帐篷', icon: '⛺', desc: '回合结束保留最多 3 护甲', effect: 'retainBlock3' },
  { id: 'dossier', name: '集团密档', icon: '🗂️', desc: '每回合第一张攻击伤害 ×1.5', effect: 'firstAttack15' }
];

const ENEMIES = [
  { id: 'looter', name: '抢购者', icon: '😤', hp: 16, intents: [{ kind: 'attack', value: 6 }, { kind: 'attack', value: 6 }, { kind: 'block', value: 4 }] },
  { id: 'hoarder', name: '囤积者', icon: '😒', hp: 24, intents: [{ kind: 'attack', value: 8 }, { kind: 'attack', value: 5 }, { kind: 'block', value: 6 }] },
  { id: 'thug', name: '物业打手', icon: '👊', hp: 20, intents: [{ kind: 'attackVuln', value: 6 }, { kind: 'attack', value: 6 }, { kind: 'block', value: 5 }] }
];

// 第一季五章 Boss 配置（Boss-1 已接入，Boss-2~5 数据备用，机制待后续接入）
const BOSSES = [
  {
    id: 'boss1', chapter: 1, name: '物业经理', icon: '🕴️', hp: 70, startBlock: 6,
    core: { name: '克扣门禁', desc: '玩家每打 1 张牌，Boss 获得 1 层克扣；Boss 攻击时每层 +1 伤害并清零' },
    attack: [{ kind: 'attack', value: 8 }, { kind: 'attack', value: 8 }, { kind: 'attack', value: 14 }],
    defense: { startBlock: 6, regen: 6, every: 3 },
    antiAttack: { stack: 1, desc: '攻击牌额外 +1 层克扣' },
    antiSkill: { stack: 2, desc: '技能牌额外 +2 层克扣' }
  },
  {
    id: 'boss2', chapter: 2, name: '区域主管', icon: '🧑‍💼', hp: 105, startBlock: 8,
    core: { name: '配给限额', desc: '每回合第 3 张及之后的牌费用 +1' },
    attack: [{ kind: 'attack', value: 10 }, { kind: 'attack', value: 10 }, { kind: 'attack', value: 12, hits: 2 }],
    defense: { startBlock: 8, regen: 8, every: 2 },
    antiAttack: { stack: 1, desc: '攻击牌使 Boss 获得 1 层配给，攻击时每层 +1 伤害' },
    antiSkill: { desc: '技能牌触发 Boss 清除自身易伤并 +3 护甲' }
  },
  {
    id: 'boss3', chapter: 3, name: '安保队长', icon: '💂', hp: 140, startBlock: 10,
    core: { name: '巡逻警戒', desc: '每 3 回合进入警戒；警戒期间玩家攻击伤害 -50%，Boss 首次受击后解除并反伤 4' },
    attack: [{ kind: 'attack', value: 12 }, { kind: 'attack', value: 12 }, { kind: 'attack', value: 18 }],
    defense: { startBlock: 10, regen: 5, every: 1 },
    antiAttack: { desc: '玩家打攻击牌时受到 2 点反伤' },
    antiSkill: { desc: '玩家打技能牌时 Boss 下回合攻击 +1' }
  },
  {
    id: 'boss4', chapter: 4, name: '核心高管', icon: '🧛', hp: 175, startBlock: 12,
    core: { name: '信息封锁', desc: '每回合开始随机 1 张手牌费用 +1；若玩家未出牌，Boss +6 护甲' },
    attack: [{ kind: 'attack', value: 14 }, { kind: 'attack', value: 14 }, { kind: 'attack', value: 16, hits: 2 }, { kind: 'attack', value: 22 }],
    defense: { startBlock: 12, regen: 12, every: 3 },
    antiAttack: { stack: 1, desc: '攻击牌使 Boss 获得 1 层封锁，攻击时每层 +1 伤害' },
    antiSkill: { desc: '技能牌使 Boss 恢复 3 HP' }
  },
  {
    id: 'boss5', chapter: 5, name: '周鸿安', icon: '👔', hp: 210, startBlock: 14,
    core: { name: '白夜倒计时', desc: '第 6 回合起每回合结束造成 10 点不可护甲伤害，每回合 +5' },
    attack: [{ kind: 'attack', value: 16 }, { kind: 'attack', value: 16 }, { kind: 'attack', value: 24, hits: 2 }, { kind: 'attack', value: 24 }],
    defense: { startBlock: 14, regen: 14, every: 3 },
    antiAttack: { desc: '攻击牌使 Boss 下回合攻击 +2' },
    antiSkill: { desc: '技能牌使 Boss 恢复 2 HP' }
  }
];

const BOSS_BUFFS = {
  boss1: [
    { id: 'access-control', name: '克扣门禁', icon: '🔒', desc: '玩家出牌增加克扣，Boss 攻击时消耗克扣并增伤' },
    { id: 'scheduled-maintenance', name: '定期维护', icon: '🛠️', desc: '每 3 回合 +6 护甲' }
  ],
  boss2: [
    { id: 'ration-limit', name: '配给限额', icon: '📦', desc: '每回合第 3 张及之后的牌费用 +1' }
  ],
  boss3: [
    { id: 'patrol-alert', name: '巡逻警戒', icon: '🚨', desc: '警戒期间玩家攻击伤害 -50%，首次受击解除并反伤' }
  ],
  boss4: [
    { id: 'info-block', name: '信息封锁', icon: '📵', desc: '每回合随机 1 张手牌费用 +1；未出牌则 Boss +6 护甲' }
  ],
  boss5: [
    { id: 'white-night', name: '白夜倒计时', icon: '⏳', desc: '第 6 回合起每回合结束造成递增不可护甲伤害' }
  ]
};

const BOSS_DECKS = {
  boss1: [
    { id: 'boss-property-warning', name: '违规通知', owner: 'boss', kind: 'debuff', icon: '📄', desc: '使玩家获得 1 层易伤' },
    { id: 'boss-property-fee', name: '临时加费', owner: 'boss', kind: 'attack', icon: '💰', desc: '造成 6 点伤害，+1 克扣' },
    { id: 'boss-property-inspection', name: '例行检查', owner: 'boss', kind: 'armor', icon: '🔍', desc: '获得 6 点护甲' }
  ],
  boss2: [
    { id: 'boss2-pile', name: '堆箱', owner: 'boss', kind: 'armor', icon: '📦', desc: '获得护甲' },
    { id: 'boss2-stock', name: '库存盘点', owner: 'boss', kind: 'debuff', icon: '📋', desc: '强化下一次攻击' },
    { id: 'boss2-lock', name: '封锁通道', owner: 'boss', kind: 'debuff', icon: '🚧', desc: '限制玩家出牌' },
    { id: 'boss2-crush', name: '仓库重压', owner: 'boss', kind: 'attack', icon: '🏗️', desc: '高额伤害' }
  ],
  boss3: [
    { id: 'boss3-baton', name: '棍击', owner: 'boss', kind: 'attack', icon: '🏏', desc: '造成伤害' },
    { id: 'boss3-chain', name: '连续催收', owner: 'boss', kind: 'attack', icon: '⛓️', desc: '连续伤害' },
    { id: 'boss3-break', name: '破坏护甲', owner: 'boss', kind: 'debuff', icon: '🔨', desc: '削减玩家护甲' },
    { id: 'boss3-block', name: '围堵', owner: 'boss', kind: 'armor', icon: '🚔', desc: '获得护甲' }
  ],
  boss4: [
    { id: 'boss4-cold', name: '寒潮', owner: 'boss', kind: 'debuff', icon: '❄️', desc: '限制玩家行动力' },
    { id: 'boss4-notice', name: '冻结通告', owner: 'boss', kind: 'debuff', icon: '📄', desc: '使手牌失效' },
    { id: 'boss4-fence', name: '冰霜护栏', owner: 'boss', kind: 'armor', icon: '🧊', desc: '获得护甲' },
    { id: 'boss4-fee', name: '降温费', owner: 'boss', kind: 'attack', icon: '💰', desc: '造成伤害' }
  ],
  boss5: [
    { id: 'boss5-final', name: '最终催缴', owner: 'boss', kind: 'attack', icon: '📬', desc: '高额伤害' },
    { id: 'boss5-stop', name: '全区停摆', owner: 'boss', kind: 'debuff', icon: '⛔', desc: '限制玩家出牌' },
    { id: 'boss5-reset', name: '合约重置', owner: 'boss', kind: 'debuff', icon: '🔁', desc: '切换阶段' },
    { id: 'boss5-clear', name: '终局清算', owner: 'boss', kind: 'attack', icon: '🏢', desc: '最终伤害' }
  ]
};

const NODES = [
  { label: '外围', enemyId: 'looter' },
  { label: '仓储区', enemyId: 'hoarder' },
  { label: '物业大堂', enemyId: 'thug' },
  { label: '最终对峙', enemyId: 'boss' }
];

const STARTER_DECK = ['pick', 'pick', 'pick', 'pick', 'wrap', 'wrap', 'wrap', 'ration', 'stock', 'expose'];

function cardById(id) { return CARDS.find(c => c.id === id); }
function equipById(id) { return EQUIPMENTS.find(e => e.id === id); }
function enemyById(id) { return ENEMIES.find(e => e.id === id); }
function bossByChapter(ch) { return BOSSES.find(b => b.chapter === ch) || BOSSES[0]; }
function bossBuffs(id) { return BOSS_BUFFS[id] || []; }
function bossDeck(id) { return BOSS_DECKS[id] || []; }
function cardPool() { return CARDS.filter(c => !c.starter); }
// —— 职业 / 技能卡 / 商店配置（大厅系统）——
const CLASSES = [
  { id: 'breaker', name: '破冰者', icon: '⛏️', desc: '攻击爆发',
    starterDeck: ['bs-strike','bs-strike','bs-strike','bs-strike','bs-frost','bs-frost','bs-block','bs-block','bs-block','bs-overpower'],
    passive: null },
  { id: 'guardian', name: '守望者', icon: '🛡️', desc: '护甲防御 · 绝地反击',
    starterDeck: ['sn-shield','sn-shield','sn-shield','sn-fortify','sn-fortify','sn-fortify','sn-rally','sn-rally','sn-comeback','sn-comeback'],
    passive: { id: 'lastStand', name: '绝地反击', desc: '撑过10回合后，本场战斗直接获胜' } }
];

const SKILL_CARDS = [
  { id: 'reserve', name: '蓄势待发', icon: '⚡', desc: '回合结束剩 n≥3 行动力 → 下一回合第一张牌数值 ×n', effect: 'reserve' },
  { id: 'emptySlot', name: '空槽倍率', icon: '🈳', desc: '倍率 = 空槽数；空槽=0 时攻击无效', effect: 'emptySlot' },
  { id: 'freeArmor', name: '免费护甲', icon: '🛡️', desc: '护甲类手牌费用变 0', effect: 'freeArmor' },
  { id: 'echoLast', name: '最后出手重触发', icon: '🔁', desc: '每回合最后打出的手牌效果再触发一次', effect: 'echoLast' },
  { id: 'attachMult', name: '附加牌倍率', icon: '➕', desc: '每用一张附加牌，倍率 +0.2（暂未生效）', effect: 'attachMult' },
  { id: 'deckDmg', name: '牌堆加伤', icon: '📚', desc: '抽牌堆每剩 1 张未抽卡，伤害 +2', effect: 'deckDmg' },
  { id: 'gamble', name: '豪赌', icon: '🎲', desc: '每回合倍数 +15；回合结束 1/6 概率自毁', effect: 'gamble' },
  { id: 'fifth', name: '五连击', icon: '✋', desc: '全场每第5张牌，该牌数值 ×4', effect: 'fifth' },
  { id: 'randomMult', name: '随机倍率', icon: '🎰', desc: '每次出牌，倍数 += 随机 1~10', effect: 'randomMult' },
  { id: 'decay', name: '强弩之末', icon: '🏹', desc: '+50 伤害，每打 1 张牌 -5（全场累计）', effect: 'decay' }
];

const ALL_SKILL_CARDS = EQUIPMENTS.concat(SKILL_CARDS);

const SHOP = {
  startGold: 100, winGold: 50, bossGold: 100,
  normalPackCost: 50, premiumPackCost: 100, skillPackCost: 80, shopCardCost: 60,
  normalPackSize: 6, premiumPackSize: 8, skillPackSize: 6,
  resetBaseCost: 30, resetCostStep: 30
};

function classById(id) { return CLASSES.find(c => c.id === id); }
function skillById(id) { return ALL_SKILL_CARDS.find(e => e.id === id); }
function handPool() { return CARDS.filter(c => !c.starter); }
function skillPool() { return ALL_SKILL_CARDS; }


