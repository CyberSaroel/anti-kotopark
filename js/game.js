import { AntiGame } from "./core/antiGame.js";
import { renderAntiBoard } from "./core/antiRenderer.js";
import { TYPES, getTypeDisplayName } from "./socionics/types.js";
import { consumeBonusErrors, addBonusErrors } from "./storage.js";
import { audioManager } from "./core/audioManager.js";
import NavigationService from "./core/navigation.js";
import { stopBoardLayoutListener, refitBoard } from "./core/boardLayout.js";
import { fetchLevel } from "./levels/levelLoader.js";

/**
 * Уровень 10 «Антикотопарк» (план v4).
 *
 * Геймплей: тап по коту (рамка) → меню социотипов → выбор.
 * Ошибка не показывает правильный ответ, только красная вспышка + счётчик.
 * Импичмент: время (120 с), ходы (60), ошибки (3 + бонус за королей).
 * Победа: все типы угаданы. Бонус за королей (настроение >= +6) в конце.
 *
 * Начиная с v5 функция обобщена: уровни 10–21 «Антикотопарка» используют
 * одну и ту же логику (startAntiLevel / startLevel10). Константы режима
 * одинаковы для всех анти-уровней.
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
 * Загрузить конфигурацию анти-уровня.
 * Уровень 10 использует встроенный хардкод (совпадает с прежним геймплеем),
 * уровни 11–21 — из json/levels/levelNNN.json.
 * @param {number} levelId
 * @returns {Promise<object>}
 */
async function loadAntiLevel(levelId) {
  if (levelId === LEVEL10_ID) {
    return makeLevel();
  }
  return fetchLevel(levelId);
}

/**
 * Запустить анти-уровень («Антикотопарк»).
 * @param {HTMLElement} root — контейнер #app
 * @param {number} levelId — номер уровня (10–21)
 */
export async function startAntiLevel(root, levelId) {
  if (levelActive) return;
  levelActive = true;

  const bonus = consumeBonusErrors();
  const errorsRemaining = START_ERRORS + bonus;

  let level;
  try {
    level = await loadAntiLevel(levelId);
  } catch (e) {
    levelActive = false;
    alert(e.message);
    return;
  }

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
  title.textContent = `Антикотопарк — уровень ${levelId}`;

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

  // ===== Вёрстка экрана: по центру поле с котами, справа статистика =====
  const stage = document.createElement("div");
  stage.className = "game-stage anti-game-stage";

  // Игровое поле (по центру)
  const boardArea = document.createElement("div");
  boardArea.className = "board-area";
  const boardWrap = document.createElement("div");
  boardWrap.className = "board-scroll-wrap";
  const boardEl = document.createElement("div");
  boardEl.id = "board";
  boardWrap.appendChild(boardEl);
  boardArea.appendChild(boardWrap);

  // Статистика (справа)
  const stats = document.createElement("div");
  stats.id = "stats";
  stats.className = "stats level10-stats";

  stage.appendChild(boardArea);
  stage.appendChild(stats);
  root.appendChild(stage);

  // Модальное окно выбора социотипа (вместо постоянного левого сайдбара)
  const socioModal = document.createElement("div");
  socioModal.className = "socio-modal";
  socioModal.hidden = true;

  const socioModalCard = document.createElement("div");
  socioModalCard.className = "socio-modal-card";

  // Декоративные изображения в модальном окне
  const socioModalDecorationLeft = document.createElement("div");
  socioModalDecorationLeft.className = "socio-modal-decoration-left";
  socioModalCard.appendChild(socioModalDecorationLeft);

  const socioModalDecorationRight = document.createElement("div");
  socioModalDecorationRight.className = "socio-modal-decoration-right";
  socioModalCard.appendChild(socioModalDecorationRight);

  const socioModalHeader = document.createElement("div");
  socioModalHeader.className = "socio-modal-header";

  const socioModalTitle = document.createElement("div");
  socioModalTitle.className = "socio-modal-title";
  socioModalTitle.textContent = "Выберите социотип";

  const socioModalClose = document.createElement("button");
  socioModalClose.className = "socio-modal-close";
  socioModalClose.textContent = "✕";
  socioModalClose.setAttribute("aria-label", "Закрыть");
  socioModalClose.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    resetCatSelection();
    hideSocioMenu();
  });

  socioModalHeader.appendChild(socioModalTitle);
  socioModalHeader.appendChild(socioModalClose);

  const socioModalList = document.createElement("div");
  socioModalList.className = "socio-modal-list";

  socioModalCard.appendChild(socioModalHeader);
  socioModalCard.appendChild(socioModalList);
  socioModal.appendChild(socioModalCard);

  // Клик вне карточки (по полю/мимо) закрывает окно — как раньше по затемнению.
  // Клик по коту не закрывает: его обрабатывает onCatClick (переключение/закрытие).
  let suppressNextBoardClick = false;
  const onDocPointerDown = (e) => {
    if (socioModal.hidden) return;
    if (socioModalCard.contains(e.target)) return;
    // Клик по коту (или его подписи) — не закрываем, обработает onCatClick
    const cell = e.target.closest && e.target.closest(".cell");
    if (cell && cell.querySelector("img.cat")) return;
    audioManager.initAudioContext();
    resetCatSelection();
    hideSocioMenu();
    // Этот клик уже ушёл на поле — не даём ему передвинуть кота/выделить клетку
    suppressNextBoardClick = true;
    setTimeout(() => { suppressNextBoardClick = false; }, 50);
  };
  document.addEventListener("pointerdown", onDocPointerDown);

  root.appendChild(socioModal);

  // --- Состояние выбора кота ---
  let catState = "idle"; // idle | selected | choosing
  let selectedCatEl = null;
  let selectedCatRC = null; // {r, c} выбранного кота
  let currentCatIndex = null; // индекс выбранного кота

  // --- Рендер ---
  function render() {
    renderAntiBoard(boardEl, game, (r, c) => {
      // Пока открыто окно выбора социотипа, поле не реагирует на клики
      // (раньше это обеспечивало затемнение) — игровая логика не меняется.
      if (!socioModal.hidden) return;
      // Клик, который только что закрыл окно, не должен двигать кота
      if (suppressNextBoardClick) return;
      // Клик по пустой клетке при выбранном коте (1-е нажатие) снимает выбор
      if (catState === "selected" && !game.board.isCat(r, c)) {
        resetCatSelection();
      }
      audioManager.initAudioContext();
      const result = game.clickCell(r, c);
      if (result.needRedraw) {
        if (result.moved) {
          movesRemaining--;
          audioManager.playSoundEffect("assets/sounds/move.mp3");
          render();
          if (movesRemaining <= 0) {
            checkImpeachment("Ходы закончились");
            return;
          }
          checkWin();
        } else if (!game.board.isCat(r, c)) {
          // Клик мимо кота (выделение/снятие через пустую клетку) — перерисовать.
          render();
          checkWin();
        } else {
          // Клик по коту без хода. Если тип кота уже известен, onCatClick
          // для него не вызывается (меню выбора социотипа не открывается),
          // поэтому рамку выбранного кота показывает перерисовка: первое
          // нажатие выделяет кота — игрок может начать передвижение,
          // второе нажатие на того же кота открывает меню (если тип неизвестен).
          const catIndex = game.getCatIndex(r, c);
          if (catIndex !== null && game.isTypeKnown(catIndex)) {
            // Не сбрасываем выделение для кота с известным типом,
            // чтобы рамка сохранялась после хода
            render();
          }
          // Для кота с неизвестным типом перерисовка не нужна: рамку и меню
          // обрабатывает onCatClick (на сенсорных экранах она ломала открытие меню).
        }
      }
    }, onCatClick);
    updateStats();
    refitBoard();
    // После перерисовки восстановить рамку выбранного кота
    if ((catState === "selected" || catState === "choosing") && selectedCatRC) {
      const el = findCatCell(selectedCatRC.r, selectedCatRC.c);
      if (el) {
        el.classList.add("cat--selected");
        selectedCatEl = el;
      }
    }
  }

  // Логика выбора: первое нажатие выбирает кота, второе по тому же — открывает меню.
  // Нажатие на нового кота считается первым (выбор переключается на него).
  function onCatClick(catIndex, r, c) {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    if (won || impeached) return;

    // Меню открыто: повторный тап по тому же коту закрывает его, но оставляет кот выделенным
    if (catState === "choosing" && currentCatIndex === catIndex) {
      catState = "selected";
      hideSocioMenu();
      return;
    }

    // Кот уже выбран рамкой: открыть меню социотипов
    if (currentCatIndex === catIndex) {
      catState = "choosing";
      showSocioMenu(catIndex);
      return;
    }

    // Новый кот (или первое нажатие): выбираем его; меню другого кота закрываем
    if (catState === "choosing") hideSocioMenu();
    catState = "selected";
    selectedCatRC = { r, c };
    currentCatIndex = catIndex;
    if (selectedCatEl) selectedCatEl.classList.remove("cat--selected");
    selectedCatEl = findCatCell(r, c);
    if (selectedCatEl) selectedCatEl.classList.add("cat--selected");
    // Устанавливаем game.selected для отображения доступных ходов
    game.selected = { r, c };
    render();
  }

  function findCatCell(r, c) {
    const idx = r * game.board.cols + c;
    return boardEl.querySelectorAll(".cell")[idx] || null;
  }

  // Кнопки социотипов в модальном окне (существующие стили анти-тайп-кнопок)
  function createTypeButtons() {
    socioModalList.innerHTML = "";
    TYPES.forEach(type => {
      const btn = document.createElement("button");
      btn.className = "anti-type-btn socio-modal-type-btn";
      btn.textContent = getTypeDisplayName(type);
      btn.addEventListener("click", () => {
        if (currentCatIndex === null) return;
        audioManager.initAudioContext();
        audioManager.playSoundEffect("assets/sounds/click.mp3");
        const catIdx = currentCatIndex;
        hideSocioMenu();
        handleGuess(catIdx, type);
      });
      socioModalList.appendChild(btn);
    });
  }

  function resetCatSelection() {
    if (selectedCatEl) selectedCatEl.classList.remove("cat--selected");
    selectedCatEl = null;
    selectedCatRC = null;
    currentCatIndex = null;
    catState = "idle";
    game.selected = null;
  }

  function hideSocioMenu() {
    // Уже скрыто или анимация закрытия уже запущена — повторно не запускаем
    if (socioModal.hidden || socioModalCard.classList.contains("closing")) return;
    socioModalCard.classList.add("closing");
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      socioModalCard.classList.remove("closing");
      socioModal.hidden = true;
    };
    socioModalCard.addEventListener("animationend", finalize, { once: true });
    // Страховка: если событие animationend не сработало (неактивная вкладка и т.п.)
    setTimeout(finalize, 350);
  }

  // Центрирование модального окна строго по центру игрового поля (доски).
  // Позиция пересчитывается при каждом открытии и при изменении размеров
  // экрана/поля/масштабировании. Окно не выходит за границы видимой области —
  // при необходимости позиция корректируется.
  function positionSocioModal() {
    const boardRect = boardEl.getBoundingClientRect();
    const modalRect = socioModal.getBoundingClientRect();
    const pad = 8;

    // Центр игрового поля
    let left = boardRect.left + boardRect.width / 2 - modalRect.width / 2;
    let top = boardRect.top + boardRect.height / 2 - modalRect.height / 2;

    // Коррекция: окно не должно выходить за видимую область экрана
    left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - modalRect.width - pad));
    top = Math.min(Math.max(pad, top), Math.max(pad, window.innerHeight - modalRect.height - pad));

    socioModal.style.left = `${left}px`;
    socioModal.style.top = `${top}px`;
    socioModal.style.transform = "none";
  }

  // Динамическое позиционирование: пересчёт по центру поля при изменении
  // размеров окна браузера, разрешения экрана и масштабировании страницы,
  // пока окно открыто. rAF — чтобы координаты доски уже были пересчитаны.
  const onViewportResize = () => {
    if (socioModal.hidden) return;
    requestAnimationFrame(positionSocioModal);
  };
  window.addEventListener("resize", onViewportResize);
  window.visualViewport?.addEventListener("resize", onViewportResize);

  function showSocioMenu(catIndex) {
    currentCatIndex = catIndex;
    socioModalTitle.textContent = `Выберите социотип — кот №${catIndex + 1}`;
    createTypeButtons();
    // Перезапуск анимации появления, если окно закрывалось анимацией
    socioModalCard.classList.remove("closing");
    socioModal.hidden = false;
    socioModalCard.style.animation = "none";
    void socioModalCard.offsetWidth; // принудительный reflow для перезапуска
    socioModalCard.style.animation = "";

    // --- Позиционирование по центру игрового поля ---
    // Скрываем окно до вычисления координат, чтобы оно не мелькало в углу
    socioModal.style.visibility = "hidden";

    requestAnimationFrame(() => {
      if (socioModal.hidden) {
        socioModal.style.visibility = "";
        return;
      }
      positionSocioModal();
      socioModal.style.visibility = "";
    });
  }

  // Закрытие модального окна по Escape
  const onModalKeyDown = (e) => {
    if (e.key === "Escape" && !socioModal.hidden) {
      audioManager.initAudioContext();
      resetCatSelection();
      hideSocioMenu();
    }
  };
  document.addEventListener("keydown", onModalKeyDown);

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
        currentCatIndex = null;
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
    currentCatIndex = null;
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
      { label: "Заново", fn: () => startAntiLevel(root, levelId) },
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
        { label: "Заново", fn: () => startAntiLevel(root, levelId) },
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
    document.removeEventListener("keydown", onModalKeyDown);
    document.removeEventListener("pointerdown", onDocPointerDown);
    window.removeEventListener("resize", onViewportResize);
    window.visualViewport?.removeEventListener("resize", onViewportResize);
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

/**
 * Обратно совместимая обёртка: запуск уровня 10 «Антикотопарк».
 * @param {HTMLElement} root — контейнер #app
 */
export function startLevel10(root) {
  return startAntiLevel(root, LEVEL10_ID);
}

/** Конфигурация уровня 10 (поле 8x8, 10 котов). */
function makeLevel() {
  return {
    id: "level10",
    rows: 8,
    cols: 8,
    cats: [
      { r: 0, c: 1, type: "Дон Кихот" },
      { r: 0, c: 3, type: "Гюго" },
      { r: 0, c: 5, type: "Максим" },
      { r: 2, c: 1, type: "Жуков" },
      { r: 2, c: 3, type: "Есенин" },
      { r: 2, c: 5, type: "Наполеон" },
      { r: 4, c: 1, type: "Бальзак" },
      { r: 4, c: 3, type: "Драйзер" },
      { r: 4, c: 5, type: "Штирлиц" },
      { r: 6, c: 1, type: "Гексли" }
    ],
    water: [[0, 7], [7, 0], [7, 7], [0, 0]]
  };
}