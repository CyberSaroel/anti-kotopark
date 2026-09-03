const MOVES_KEY = "ak_gs_total_moves";
const TIME_KEY = "ak_gs_total_time_ms";

// Устаревшие ключи старого хранилища (royal-socio-cats). Разовая миграция
// при чтении: если новые ключи ещё пусты (значения по умолчанию 0), а старые — нет,
// берём значения из старых и сразу сохраняем под новыми ключами.
const LEGACY_MOVES_KEY = "socio-cats:totalMoves";
const LEGACY_TIME_KEY = "socio-cats:totalTimeMs";

let totalMoves = 0;
let totalTimeMs = 0;

function load() {
  try {
    totalMoves = parseInt(localStorage.getItem(MOVES_KEY), 10) || 0;
    totalTimeMs = parseInt(localStorage.getItem(TIME_KEY), 10) || 0;

    // Миграция со старого хранилища (royal-socio-cats, ключи "socio-cats:*"):
    // если в новом хранилище ещё ничего нет, а в старом уже было — переносим.
    if (totalMoves === 0 && totalTimeMs === 0) {
      const legacyMoves = parseInt(localStorage.getItem(LEGACY_MOVES_KEY), 10) || 0;
      const legacyTimeMs = parseInt(localStorage.getItem(LEGACY_TIME_KEY), 10) || 0;
      if (legacyMoves > 0 || legacyTimeMs > 0) {
        totalMoves = legacyMoves;
        totalTimeMs = legacyTimeMs;
        save();
      }
    }
  } catch (e) {
    totalMoves = 0;
    totalTimeMs = 0;
  }
}

function save() {
  try {
    localStorage.setItem(MOVES_KEY, String(totalMoves));
    localStorage.setItem(TIME_KEY, String(totalTimeMs));
  } catch (e) {
    // игнорируем ошибки хранилища
  }
}

load();

export function addTotalMoves(n) {
  totalMoves += n;
  save();
}

export function addTotalTime(ms) {
  totalTimeMs += ms;
  save();
}

export function getTotalMoves() {
  return totalMoves;
}

export function getTotalTimeMs() {
  return totalTimeMs;
}
