import { AntiGame } from "./core/antiGame.js";
import { renderAntiBoard } from "./core/antiRenderer.js";
import { TYPES, getTypeDisplayName } from "./socionics/types.js";
import { consumeBonusErrors, addBonusErrors } from "./storage.js";
import { audioManager } from "./core/audioManager.js";
import NavigationService from "./core/navigation.js";
import { stopBoardLayoutListener, refitBoard } from "./core/boardLayout.js";

/**
 * Уровень 10 «Антикотопарк» (план v4).
 *
 * Геймплей: тап по коту (рамка) → меню социотипов → выбор.
 * Ошибка не показывает правильный ответ, только красная вспышка + счётчик.
 * Импичмент: время (120 с), ходы (60), ошибки (3 + бонус за королей).
 * Победа: все типы угаданы. Бонус за королей (настроение >= +6) в конце.
 */

const START_TIME = 120;           // секунд
const START_MOVES = 60;           // ходов
const START_ERRORS = 3;           // лимит ошибок
const MOVE_BONUS_HAPPY = 10;      // +ходов за довольного кота
const TIME_BONUS_HAPPY = 20;      // +секунд за довольного кота
const KING_MOOD = 6;              // король: настроение >= 6

export const LEVEL10_ID = 10;

let levelActive = false;
let timerId = null;

/**
 * Запустить уровень 10.
 * @param {HTMLElement} root — контейнер #app
 */
export function startLevel10(root) {
  if (levelActive) return;
  levelActive = true;

  const bonus = consumeBonusErrors();
  const errorsRemaining = START_ERRORS + bonus;
  const level = makeLevel();

  const game = new AntiGame(level);

  // Счётчики состояния
  let timeRemaining = START_TIME;
  let movesRemaining = START_MOVES;
  let errorsMade = 0;
  let currentErrorsRemaining = errorsRemaining;
  let won = false;
  let impeached = false;
  let timerStarted = false;

  // --- Отображение ---
  root.innerHTML = "";
  root.className = "game-screen anti-game-screen";

  const bar = document.createElement("div");
  bar.className = "topbar";

  const topRow = document.createElement("div");
  topRow.className = "topbar-row";

  const title = document.createElement("span");
  title.className = "topbar-title";
  title.textContent = "Антикотопарк — уровень 10";

  const leaveBtn = document.createElement("button");
  leaveBtn.className = "topbar-leave";
  leaveBtn.textContent = "Меню";
  leaveBtn.addEventListener("click", () => {
    cleanupLevel();
    showMenu();
  });

  // Очистка при уходе с экрана (браузерная/аппаратная кнопка «Назад»)
  NavigationService.setOnLeave(cleanupLevel);

  topRow.appendChild(title);
  topRow.appendChild(leaveBtn);
  bar.appendChild(topRow);
  root.appendChild(bar);

  // Статистика
  const stats = document.createElement("div");
  stats.id = "stats";
  stats.className = "stats level10-stats";
  root.appendChild(stats);

  // Игровое поле
  const boardArea = document.createElement("div");
  boardArea.className = "board-area";
  const boardWrap = document.createElement("div");
  boardWrap.className = "board-scroll-wrap";
  const boardEl = document.createElement("div");
  boardEl.id = "board";
  boardWrap.appendChild(boardEl);
  boardArea.appendChild(boardWrap);
  root.appendChild(boardArea);

  // Меню социотипов (столбик)
  const socioMenu = document.createElement("div");
  socioMenu.className = "socio-menu";
  socioMenu.hidden = true;
  root.appendChild(socioMenu);

  // --- Состояние выбора кота ---
  let catState = "idle"; // idle | selected | choosing
  let selectedCatEl = null;
  let selectedCatRC = null; // {r, c} выбранного кота

  // --- Рендер ---
  function render() {
    renderAntiBoard(boardEl, game, (r, c) => {
      audioManager.initAudioContext();
      const result = game.clickCell(r, c);
      if (result.needRedraw) {
        if (result.moved) {
          movesRemaining--;
          audioManager.playSoundEffect("assets/sounds/move.mp3");
        }
        render();
        if (result.moved && movesRemaining <= 0) {
          checkImpeachment("Ходы закончились");
          return;
        }
        checkWin();
      }
    }, onCatClick);
    updateStats();
    refitBoard();
  }

  // Тап по коту: idle → selected → choosing → hide
  function onCatClick(catIndex, r, c) {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    if (won || impeached) return;
    if (catState === "idle") {
      catState = "selected";
      selectedCatRC = { r, c };
      selectedCatEl = findCatCell(r, c);
      if (selectedCatEl) selectedCatEl.classList.add("cat--selected");
    } else if (catState === "selected") {
      catState = "choosing";
      showSocioMenu(catIndex);
    } else {
      catState = "idle";
      hideSocioMenu();
      if (selectedCatEl) selectedCatEl.classList.remove("cat--selected");
      selectedCatEl = null;
      selectedCatRC = null;
    }
  }

  function findCatCell(r, c) {
    const idx = r * game.board.cols + c;
    return boardEl.querySelectorAll(".cell")[idx] || null;
  }

  function hideSocioMenu() {
    socioMenu.hidden = true;
    socioMenu.innerHTML = "";
  }

  function showSocioMenu(catIndex) {
    socioMenu.innerHTML = "";
    socioMenu.hidden = false;
    const heading = document.createElement("div");
    heading.className = "socio-menu-title";
    heading.textContent = "Выберите социотип";
    socioMenu.appendChild(heading);

    TYPES.forEach(type => {
      const btn = document.createElement("button");
      btn.className = "socio-type-btn";
      btn.textContent = getTypeDisplayName(type);
      btn.addEventListener("click", () => {
        audioManager.initAudioContext();
        audioManager.playSoundEffect("assets/sounds/click.mp3");
        handleGuess(catIndex, type);
      });
      socioMenu.appendChild(btn);
    });
  }

  // ==== Обработка выбора социотипа ====
  function handleGuess(catIndex, guessedType) {
    if (won || impeached) return;
    const result = game.makeGuess(catIndex, guessedType);
    if (result.correct) {
      // Успех: довольный кот
      audioManager.playSoundEffect("assets/sounds/victory/1.mp3");
      movesRemaining += MOVE_BONUS_HAPPY;
      timeRemaining += TIME_BONUS_HAPPY;
      showFloatingBonus(`+${MOVE_BONUS_HAPPY} 👣 +${TIME_BONUS_HAPPY} ⏱`);
    } else {
      // Ошибка: НЕ показываем правильный ответ
      errorsMade++;
      currentErrorsRemaining--;
      audioManager.playSoundEffect("assets/sounds/click.mp3");
      flashCatRed();
      if (currentErrorsRemaining <= 0) {
        catState = "idle";
        hideSocioMenu();
        if (selectedCatEl) selectedCatEl.classList.remove("cat--selected");
        selectedCatEl = null;
        selectedCatRC = null;
        render();
        checkImpeachment("Ошибки типирования сверх лимита");
        return;
      }
    }
    catState = "idle";
    hideSocioMenu();
    if (selectedCatEl) selectedCatEl.classList.remove("cat--selected");
    selectedCatEl = null;
    selectedCatRC = null;
    render();
    checkWin();
  }

  function flashCatRed() {
    if (!selectedCatRC) return;
    const cell = findCatCell(selectedCatRC.r, selectedCatRC.c);
    if (!cell) return;
    cell.classList.add("cat--error");
    setTimeout(() => cell.classList.remove("cat--error"), 400);
  }

  function showFloatingBonus(text) {
    const el = document.createElement("div");
    el.className = "level10-bonus-float";
    el.textContent = text;
    boardArea.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  // ==== Бонус за довольных котов (mood >= +1), одноразово за уровень ====
  let happyBonusGranted = false;
  function checkHappyBonus() {
    if (happyBonusGranted || won || impeached) return;
    const cats = game.board.allCats();
    let happy = 0;
    for (const cat of cats) {
      const m = game.moodAt(cat.r, cat.c);
      if (m >= 1) happy++;
    }
    if (happy > 0) {
      happyBonusGranted = true;
      movesRemaining += happy;
      timeRemaining += happy * 2;
      showFloatingBonus(`+${happy} 👣 +${happy * 2} ⏱`);
      updateStats();
    }
  }

  // ==== Импичмент ====
  function checkImpeachment(reason) {
    if (won || impeached) return;
    impeached = true;
    cleanupLevel();
    showResultOverlay("Импичмент", reason, [
      { label: "Заново", fn: () => startLevel10(root) },
      { label: "В меню", fn: showMenu }
    ]);
  }

  // ==== Победа ====
  function checkWin() {
    if (won || impeached) return;
    if (game.isWin()) {
      won = true;
      cleanupLevel();
      // Короли: настроение >= 6
      let kings = 0;
      for (const cat of game.board.allCats()) {
        if (game.moodAt(cat.r, cat.c) >= KING_MOOD) kings++;
      }
      if (kings > 0) addBonusErrors(kings);
      showResultOverlay("Победа!", "Все социотипы угаданы!", [
        { label: "Заново", fn: () => startLevel10(root) },
        { label: "В меню", fn: showMenu }
      ], `Ошибки: ${errorsMade} | Короли: ${kings} | Бонус: +${kings} ошибок на след. уровень`);
    }
  }

  function showResultOverlay(heading, sub, actions, extra) {
    const overlay = document.createElement("div");
    overlay.className = "level10-result-overlay";
    overlay.innerHTML = `
      <div class="level10-result-card">
        <h2>${heading}</h2>
        <p>${sub}</p>
        ${extra ? `<p class="level10-result-extra">${extra}</p>` : ""}
      </div>
    `;
    const card = overlay.querySelector(".level10-result-card");
    actions.forEach(a => {
      const btn = document.createElement("button");
      btn.className = "win-btn";
      btn.textContent = a.label;
      btn.addEventListener("click", () => {
        overlay.remove();
        a.fn();
      });
      card.appendChild(btn);
    });
    root.appendChild(overlay);
  }

  // ==== Обновление HUD ====
  function updateStats() {
    const seconds = Math.max(0, Math.ceil(timeRemaining));
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    stats.innerHTML = `
      <div class="stat-item">⏱ Время: ${mm}:${ss}</div>
      <div class="stat-item">👣 Ходы: ${movesRemaining}</div>
      <div class="stat-item">❌ Ошибки: ${errorsMade} | Осталось: ${currentErrorsRemaining}</div>
      <div class="stat-item">😊 Угадано: ${game.getGuessedCount()}/${level.cats.length}</div>
    `;
  }

  // ==== Таймер ====
  function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
    timerId = setInterval(() => {
      if (!levelActive || won || impeached) return;
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        updateStats();
        checkImpeachment("Время вышло");
        return;
      }
      updateStats();
    }, 1000);
  }

  // ==== Очистка ====
  function cleanupLevel() {
    levelActive = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    stopBoardLayoutListener();
  }

  function showMenu() {
    import("./screens/introScreen.js").then(m => m.showIntroScreen(root));
  }

  // Старт таймера по первому взаимодействию
  boardEl.addEventListener("click", startTimer, { once: true });
  boardEl.addEventListener("touchstart", startTimer, { once: true });

  render();
  // Одноразовый бонус за довольных котов с самого старта
  checkHappyBonus();
}

/** Конфигурация уровня 10 (совпадает с anti-test). */
function makeLevel() {
  return {
    id: "level10",
    rows: 6,
    cols: 6,
    cats: [
      { r: 0, c: 0, type: "Дон Кихот" },
      { r: 0, c: 2, type: "Гюго" },
      { r: 0, c: 4, type: "Максим" },
      { r: 1, c: 1, type: "Жуков" },
      { r: 1, c: 3, type: "Есенин" },
      { r: 2, c: 0, type: "Наполеон" },
      { r: 2, c: 2, type: "Бальзак" },
      { r: 2, c: 4, type: "Драйзер" },
      { r: 3, c: 1, type: "Штирлиц" },
      { r: 3, c: 3, type: "Гексли" }
    ],
    water: []
  };
}