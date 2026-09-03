const RECORDS_KEY = "ak_level_records";

// Устаревший ключ старого хранилища (royal-socio-cats). Разовая миграция
// при чтении: если новый ключ пуст, а старый — нет, берём значение из
// старого и сразу сохраняем под новым ключом.
const LEGACY_RECORDS_KEY = "socio-cats:levelRecords";

function normalizeRecord(raw) {
  if (raw === undefined || raw === null) return {};
  if (typeof raw === "number") return { moves: raw };
  return {
    moves: raw.moves,
    timeMs: raw.timeMs,
    kings: raw.kings
  };
}

function getRecordEntry(records, levelId) {
  return normalizeRecord(records[levelId]);
}

export function getLevelRecords() {
  try {
    let data = localStorage.getItem(RECORDS_KEY);
    if (data === null) {
      const legacy = localStorage.getItem(LEGACY_RECORDS_KEY);
      if (legacy !== null) {
        localStorage.setItem(RECORDS_KEY, legacy);
        data = legacy;
      }
    }
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function saveLevelRecord(levelId, moveCount) {
  const records = getLevelRecords();
  const entry = getRecordEntry(records, levelId);
  const currentBest = entry.moves;

  if (currentBest === undefined || moveCount < currentBest) {
    const improvement = currentBest !== undefined ? currentBest - moveCount : 0;
    entry.moves = moveCount;
    records[levelId] = entry;
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { isNewRecord: true, improvement, previousBest: currentBest };
  }

  return { isNewRecord: false, improvement: 0, previousBest: currentBest };
}

export function saveLevelTimeRecord(levelId, timeMs) {
  const records = getLevelRecords();
  const entry = getRecordEntry(records, levelId);
  const currentBest = entry.timeMs;

  if (currentBest === undefined || timeMs < currentBest) {
    const improvement = currentBest !== undefined ? currentBest - timeMs : 0;
    entry.timeMs = timeMs;
    records[levelId] = entry;
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { isNewRecord: true, improvement, previousBest: currentBest };
  }

  return { isNewRecord: false, improvement: 0, previousBest: currentBest };
}

export function saveLevelKingsRecord(levelId, kings) {
  const records = getLevelRecords();
  const entry = getRecordEntry(records, levelId);
  const currentBest = entry.kings;

  if (currentBest === undefined || kings > currentBest) {
    const improvement = currentBest !== undefined ? kings - currentBest : 0;
    entry.kings = kings;
    records[levelId] = entry;
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { isNewRecord: true, improvement, previousBest: currentBest };
  }

  return { isNewRecord: false, improvement: 0, previousBest: currentBest };
}

export function getBestMoveCount(levelId) {
  const records = getLevelRecords();
  return getRecordEntry(records, levelId).moves;
}

export function getBestTime(levelId) {
  const records = getLevelRecords();
  return getRecordEntry(records, levelId).timeMs;
}

export function getBestKings(levelId) {
  const records = getLevelRecords();
  return getRecordEntry(records, levelId).kings;
}

export function getAllRecords() {
  const records = getLevelRecords();
  const normalized = {};

  for (const [levelId, raw] of Object.entries(records)) {
    normalized[levelId] = getRecordEntry(records, levelId);
  }

  return normalized;
}