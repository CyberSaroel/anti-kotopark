/**
 * Реестр уровней 10–100 (план v4/v5).
 *
 * - Уровень 10 — «Антикотопарк» (главный, запускается кнопкой «Начать игру»).
 * - Уровни 1–9 НЕ существуют (выключены).
 * - Уровни 11–21 — «Антикотопарк»: используют ту же логику, что уровень 10,
 *   конфигурация загружается из json/levels/levelNNN.json.
 * - Уровни 22–100 — доступны в классическом режиме.
 */

export const LEVELS = {
  // 1–9: не существуют
  10: { id: 10, title: "Антикотопарк", enabled: true, mode: "anti" },
  11: { id: 11, title: "Уровень 11", enabled: true, mode: "anti" },
  12: { id: 12, title: "Уровень 12", enabled: true, mode: "anti" },
  13: { id: 13, title: "Уровень 13", enabled: true, mode: "anti" },
  14: { id: 14, title: "Уровень 14", enabled: true, mode: "anti" },
  15: { id: 15, title: "Уровень 15", enabled: true, mode: "anti" },
  16: { id: 16, title: "Уровень 16", enabled: true, mode: "anti" },
  17: { id: 17, title: "Уровень 17", enabled: true, mode: "anti" },
  18: { id: 18, title: "Уровень 18", enabled: true, mode: "anti" },
  19: { id: 19, title: "Уровень 19", enabled: true, mode: "anti" },
  20: { id: 20, title: "Уровень 20", enabled: true, mode: "anti" },
  21: { id: 21, title: "Уровень 21", enabled: true, mode: "anti" },
};

// Уровни 22–100 — классический режим (JSON уже есть)
for (let id = 22; id <= 100; id++) {
  LEVELS[id] = { id, title: `Уровень ${id}`, enabled: true, mode: "classic" };
}

/** Получить описание уровня или null. */
export function getLevel(id) {
  return LEVELS[id] || null;
}

/** Список включённых уровней в порядке возрастания. */
export function getEnabledLevels() {
  return Object.values(LEVELS)
    .filter(l => l.enabled)
    .sort((a, b) => a.id - b.id);
}

/** Список id включённых уровней. */
export const LEVEL_IDS = getEnabledLevels().map(l => l.id);