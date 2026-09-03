// Прогресс прохождения уровней — в localStorage браузера.
const KEY = "ak_completed";

// Устаревший ключ старого хранилища (royal-socio-cats). Разовая миграция
// при чтении: если новый ключ пуст, а старый — нет, берём значение из
// старого и сразу сохраняем под новым ключом.
const LEGACY_KEY = "socio-cats:completed";

function migrateFromLegacy() {
  try {
    if (localStorage.getItem(KEY) !== null) return;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) localStorage.setItem(KEY, legacy);
  } catch (e) {
    // Игнорируем ошибки хранилища
  }
}

export function getCompleted() {
  try {
    migrateFromLegacy();
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch { return new Set(); }
}

export function isCompleted(id) { return getCompleted().has(id); }

export function markCompleted(id) {
  const s = getCompleted();
  s.add(id);
  localStorage.setItem(KEY, JSON.stringify([...s]));
}

export function resetProgress() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LEGACY_KEY);
}
