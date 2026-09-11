/**
 * Проверка корректности оптимизаций расчёта настроения (mood).
 *
 * Запуск:  node tools/verifyMood.js
 *
 * Гарантирует, что оптимизированный calcMood() (числовая матрица
 * MOOD_DELTA_MATRIX + быстрый индекс типов) выдаёт РОВНО те же значения, что и
 * прежняя реализация (getRelation() + MOOD_DELTA по строкам), а кэш
 * Board.moodAt() корректно инвалидируется после хода кота.
 */
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const url = (p) => pathToFileURL(path.join(root, p)).href;

(async () => {
  const { TYPES } = await import(url('js/socionics/types.js'));
  const { getRelation, MOOD_DELTA, MOOD_DELTA_MATRIX } =
    await import(url('js/socionics/relations.js'));
  const { calcMood } = await import(url('js/socionics/mood.js'));
  const { Board } = await import(url('js/core/board.js'));

  let failed = false;
  const check = (name, ok) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) failed = true;
  };

  // 1) Числовая матрица должна совпадать со строковым MOOD_DELTA.
  let matOk = true;
  for (let i = 0; i < TYPES.length; i++) {
    for (let j = 0; j < TYPES.length; j++) {
      const expect = MOOD_DELTA[getRelation(TYPES[i], TYPES[j])] ?? 0;
      if (MOOD_DELTA_MATRIX[i * 16 + j] !== expect) {
        matOk = false;
        console.error(`  mismatch ${TYPES[i]}->${TYPES[j]}`);
      }
    }
  }
  check('MOOD_DELTA_MATRIX == MOOD_DELTA[getRelation()]', matOk);

  // 2) calcMood() на случайных досках должен совпадать с прежним алгоритмом.
  const refMood = (board, r, c) => {
    const type = board.typeAt(r, c);
    if (!type) return null;
    let score = 0;
    for (const n of board.catNeighbors(r, c)) {
      const rel = getRelation(type, board.typeAt(n.r, n.c));
      score += (MOOD_DELTA[rel] ?? 0);
    }
    return Math.max(-6, Math.min(6, score));
  };

  const rndInt = (n) => Math.floor(Math.random() * n);
  let rndOk = true;
  let checks = 0;
  for (let t = 0; t < 200 && rndOk; t++) {
    const rows = 8, cols = 8;
    const level = { rows, cols, cats: [], water: [] };
    const used = new Set();
    const take = (arr) => {
      let r, c, key;
      do { r = rndInt(rows); c = rndInt(cols); key = `${r},${c}`; } while (used.has(key));
      used.add(key);
      arr.push([r, c]);
    };
    for (let k = 0; k < 12; k++) {
      const before = level.cats.length;
      take(level.cats);
      const [r, c] = level.cats[before];
      level.cats[before] = { r, c, type: TYPES[rndInt(16)] };
    }
    for (let k = 0; k < 5; k++) take(level.water);

    const board = Board.fromLevel(level);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        checks++;
        if (calcMood(board, r, c) !== refMood(board, r, c)) {
          rndOk = false;
          console.error(`  mismatch at ${r},${c}`);
        }
      }
    }
  }
  check(`calcMood() == reference (${checks} checks)`, rndOk);

  // 3) Кэш Board.moodAt() должен инвалидироваться при ходе.
  const b = Board.fromLevel({
    rows: 3, cols: 3,
    cats: [
      { r: 0, c: 0, type: 'Дон Кихот' },
      { r: 0, c: 1, type: 'Дюма' },
      { r: 2, c: 2, type: 'Габен' },
    ],
    water: [],
  });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) b.moodAt(r, c);
  b.moveCat({ r: 0, c: 0 }, { r: 1, c: 1 });
  let cacheOk = true;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (b.moodAt(r, c) !== refMood(b, r, c)) {
        cacheOk = false;
        console.error(`  stale cache at ${r},${c}`);
      }
    }
  }
  check('Board.moodAt() cache invalidates after move', cacheOk);

  console.log(failed ? '\nFAILED' : '\nALL CHECKS PASSED');
  process.exit(failed ? 1 : 0);
})();
