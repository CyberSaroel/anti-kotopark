/**
 * Королевская экономика и общая статистика.
 *
 * Адаптация модулей royal-socio-cats (royalEconomy.js + gameStats.js)
 * под архитектуру anti-kotopark: те же функции и логика, но ключи
 * localStorage — с префиксом "ak_" (как в js/storage.js).
 *
 * - Короли (mood >= 6) на уровне копятся в kingsThisLevel.
 * - При победе commitLevel() переводит их в общий счёт и даёт ракеты.
 * - Ракеты тратятся кнопкой «🚀 Ракеты» (+10 ходов, +20 сек).
 * - Суммарные ходы и время на уровне копятся в общей статистике.
 */

const KINGS_TOTAL_KEY = "ak_kings_total";
const ROCKETS_KEY = "ak_rockets";
const TOTAL_MOVES_KEY = "ak_total_moves";
const TOTAL_TIME_KEY = "ak_total_time_ms";

let kingsThisLevel = 0;
let kingsTotal = 0;
let rockets = 0;
let totalMoves = 0;
let totalTimeMs = 0;

function loadFromStorage() {
  try {
    kingsTotal = parseInt(localStorage.getItem(KINGS_TOTAL_KEY), 10) || 0;
    rockets = parseInt(localStorage.getItem(ROCKETS_KEY), 10) || 0;
    totalMoves = parseInt(localStorage.getItem(TOTAL_MOVES_KEY), 10) || 0;
    totalTimeMs = parseInt(localStorage.getItem(TOTAL_TIME_KEY), 10) || 0;
  } catch (e) {
    kingsTotal = 0;
    rockets = 0;
    totalMoves = 0;
    totalTimeMs = 0;
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(KINGS_TOTAL_KEY, String(kingsTotal));
    localStorage.setItem(ROCKETS_KEY, String(rockets));
    localStorage.setItem(TOTAL_MOVES_KEY, String(totalMoves));
    localStorage.setItem(TOTAL_TIME_KEY, String(totalTimeMs));
  } catch (e) {
    // Игнорируем ошибки хранилища
  }
}

loadFromStorage();

/** Кот стал королём (mood >= 6). */
export function onKingCreated() {
  kingsThisLevel++;
}

/** Кот перестал быть королём. */
export function onKingLost() {
  if (kingsThisLevel > 0) {
    kingsThisLevel--;
  }
}

/**
 * Зачислить королей уровня в общий счёт и начислить ракеты.
 * @param {number} [amountToAdd] — сколько королей реально засчитать
 *   (анти-фарм: только прибавка над прошлым рекордом уровня).
 */
export function commitLevel(amountToAdd) {
  const add = (amountToAdd === undefined) ? kingsThisLevel : amountToAdd;
  rockets += add;
  kingsTotal += add;
  saveToStorage();
  kingsThisLevel = 0; // защита от двойного зачисления
}

/** Сброс королей уровня (рестарт/импичмент). */
export function resetLevel() {
  kingsThisLevel = 0;
}

/** Текущее число королей на уровне. */
export function getKingsThisLevel() { return kingsThisLevel; }

/** Всего королей за всю игру. */
export function getKingsTotal() { return kingsTotal; }

/** Доступные ракеты. */
export function getRockets() { return rockets; }

/** Потратить ракету. Возвращает true, если удалось. */
export function spendRocket() {
  if (rockets > 0) {
    rockets--;
    saveToStorage();
    return true;
  }
  return false;
}

/** Добавить ракеты (рыбки) — тестовая кнопка для заказчика. */
export function addRockets(n) {
  rockets += n;
  saveToStorage();
  return rockets;
}

/** Установить точное число ракет (сброс рыбок при выходе с уровня). */
export function setRockets(n) {
  rockets = n;
  saveToStorage();
  return rockets;
}

/** Общее число ходов за всю игру. */
export function addTotalMoves(n) {
  totalMoves += n;
  saveToStorage();
}

/** Общее время за всю игру (мс). */
export function addTotalTime(ms) {
  totalTimeMs += ms;
  saveToStorage();
}

export function getTotalMoves() { return totalMoves; }
export function getTotalTimeMs() { return totalTimeMs; }