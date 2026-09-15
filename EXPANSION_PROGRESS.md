# 《七日回雪》高重玩性扩展 · 进度

## 当前实际内容数量（2026-09-16）
- 普通手牌 CARDS：32 张（含破冰者/守望者各 4 张职业基础牌）
- 技能牌 SKILL_CARDS：10 张；旧装备 EQUIPMENTS：6 张
- 职业 CLASSES：2 个（破冰者 / 守望者）
- Boss：BOSSES 5 个（数据占位）；BOSS_DECKS 5 组（静态占位）
- 章节 CHAPTERS：5 章，每章 6 节点（2 普通战 + 1 精英 + 商店 + 休整 + Boss）
- seeded RNG：已接入；Run.seed 已显示
- 存档：localStorage 已接入（qirihui-run），刷新可继续本局

## 已完成阶段
- Phase 1（地基）：seeded RNG、Node 加载守卫、validateData、基础分类隔离。
- Phase 2（五章 Run/节点/保存恢复）核心：五章 CHAPTERS、节点地图、普通/精英/商店/休整/Boss 节点、章节推进、localStorage 保存/恢复、Boss 按章节缩放。
  - 未完成：事件节点（本版路线用休整替代事件）、失败重开的具体语义、完整五章通关后的最终结算。

## 未完成阶段
- Phase 3：四职业与 96 张普通手牌（当前 2 职业、32 张普通牌）。
- Phase 4：统一事件总线与完整伤害管线（base/addMult/multiplyMult/retrigger/finalDamage 结构化步骤）。
- Phase 5：60 技能牌 + 20 遗物 + 18 消耗品 + 24 强化。
- Phase 6：商店利息、卡牌删除/强化/出售、许可证、事件。
- Phase 7：15 Boss 真实接入（当前 boss2~5 静态占位）。
- Phase 8：8 档暴雪、12 挑战、局外解锁、图鉴。
- Phase 9：500 局模拟与平衡报告。
- Phase 10：完整端到端与视觉回归。
