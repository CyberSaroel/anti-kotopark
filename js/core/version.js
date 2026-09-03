export const VERSION = "1.3.0";

const STORAGE_KEY = "ak_version";

// Устаревший ключ старого хранилища (royal-socio-cats). Разовая миграция
// при чтении: если новый ключ пуст, а старый — нет, берём значение из
// старого и сразу сохраняем под новым ключом.
const LEGACY_STORAGE_KEY = "socio-cats:version";

function migrateFromLegacy() {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) localStorage.setItem(STORAGE_KEY, legacy);
  } catch (e) {
    // ignore
  }
}

export function saveVersion() {
  try {
    localStorage.setItem(STORAGE_KEY, VERSION);
  } catch (e) {
    // ignore
  }
}

export function getSavedVersion() {
  try {
    migrateFromLegacy();
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}