export const VERSION = "1.3.0";

const STORAGE_KEY = "socio-cats:version";

export function saveVersion() {
  try {
    localStorage.setItem(STORAGE_KEY, VERSION);
  } catch (e) {
    // ignore
  }
}

export function getSavedVersion() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}