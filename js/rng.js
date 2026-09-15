// 《七日回雪》v10 种子随机数引擎（mulberry32）
'use strict';

const RNG = (function () {
  let state = 0x9e3779b9;

  function seed(value) {
    let s = typeof value === 'number' ? value >>> 0 : String(value || Date.now()).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0x811c9dc5);
    state = s >>> 0;
    return state;
  }

  function next() {
    state |= 0; state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(arr) {
    return arr.length ? arr[Math.floor(next() * arr.length)] : undefined;
  }

  return { seed, next, range, shuffle, pick };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { RNG };
