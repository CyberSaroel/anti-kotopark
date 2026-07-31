/**
 * localStorage-хелперы для «Антикотопарка» (плана v4).
 */

const LS_BONUS = "ak_bonus_errors";
const LS_MUSIC = "ak_music_on";
const LS_SFX = "ak_sfx_on";
const LS_THEME = "ak_theme";

// ==== Бонусные ошибки за королей ====

export function getBonusErrors() {
  try {
    const v = parseInt(localStorage.getItem(LS_BONUS) || "0", 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function addBonusErrors(n) {
  const cur = getBonusErrors();
  try {
    localStorage.setItem(LS_BONUS, String(cur + n));
  } catch {
    // ignore
  }
  return cur + n;
}

/** Снять все накопленные бонусные ошибки (используются при старте уровня). */
export function consumeBonusErrors() {
  const b = getBonusErrors();
  try {
    localStorage.setItem(LS_BONUS, "0");
  } catch {
    // ignore
  }
  return b;
}

// ==== Музыка / звук ====

export function isMusicOn() {
  try {
    return localStorage.getItem(LS_MUSIC) !== "0";
  } catch {
    return true;
  }
}

export function setMusicOn(on) {
  try {
    localStorage.setItem(LS_MUSIC, on ? "1" : "0");
  } catch {
    // ignore
  }
}

export function isSfxOn() {
  try {
    return localStorage.getItem(LS_SFX) !== "0";
  } catch {
    return true;
  }
}

export function setSfxOn(on) {
  try {
    localStorage.setItem(LS_SFX, on ? "1" : "0");
  } catch {
    // ignore
  }
}

// ==== Тема ====

export function getSavedTheme() {
  try {
    return localStorage.getItem(LS_THEME) || "dark";
  } catch {
    return "dark";
  }
}

export function setSavedTheme(name) {
  try {
    localStorage.setItem(LS_THEME, name);
  } catch {
    // ignore
  }
}