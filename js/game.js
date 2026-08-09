import { AntiGame } from "./core/antiGame.js";
import { renderAntiBoard } from "./core/antiRenderer.js";
import { TYPES, getTypeDisplayName } from "./socionics/types.js";
import { consumeBonusErrors, addBonusErrors } from "./storage.js";
import { audioManager } from "./core/audioManager.js";
import NavigationService from "./core/navigation.js";
import { stopBoardLayoutListener, refitBoard } from "./core/boardLayout.js";
import { fetchLevel } from "./levels/levelLoader.js";
import { getBestKings } from "./levels/levelRecords.js";
import {
  onKingCreated,
  onKingLost,
  commitLevel,
  resetLevel,
  getKingsThisLevel,
  getRockets,
  spendRocket,
  addTotalMoves,
  addTotalTime
} from "./core/royalStats.js";

/**
 * Уровень 10 «Антикотопарк» (план v4).
 *
 * Геймплей: тап по коту (рамка) → меню социотипов → выбор.
 * Ошибка не показывает правильный ответ, только красная вспышка + счётчик.
 * Импичмент: время (120 с), ходы (60), ошибки (3 + бонус за королей).
 * Победа: все типы угаданы. Бонус за королей (настроение >= +6) в конце.
 *
 * Начиная с v5 функция обобщена: уровни 10–51 «Антикотопарка» используют
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
 * уровни 11–51 — из json/levels/levelNNN.json.
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
 * @param {number} levelId — номер уровня (10–51)
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

  // ==== Дополнительные счётчики (адаптация royal-socio-cats) ====
  // Сброс королей уровня (если предыдущий уровень не был завершён).
  resetLevel();
  let levelStartTime = Date.now();
  let elapsedMs = 0;                 // ⏰ На уровне
  let levelRemainingMs = START_TIME * 1000; // ⏱️ Время: осталось (новый счётчик)
  let maxHappyCats = 0;              // ⭐ Макс. довольных
  let maxHappyInitialized = false;
  let previousKings = new Set();     // короли на прошлой отрисовке («клетка»)
  let kingsAtWin = 0;                // 👑 короли, зафиксированные при победе
  let levelCleaned = false;          // защита от двойного addTotalTime
  let royalTimerId = null;           // таймер новых счётчиков (200 мс)

  // --- Отображение ---
  root.innerHTML = "";
  root.className = "game-screen anti-game-screen";

  // Компактное отображение панели управления на мобильных (как в классическом режиме)
  function isCompactUI() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  // Переход между уровнями/в меню: сначала очистка текущего уровня, затем навигация.
  // Используется существующая система навигации NavigationService.
  function leaveLevel(navigate) {
    cleanupLevel();
    navigate();
  }

  const bar = document.createElement("div");
  bar.className = "topbar";

  const topRow = document.createElement("div");
  topRow.className = "topbar-row";

  // Индикатор текущего уровня
  const title = document.createElement("span");
  title.className = "topbar-title";
  title.textContent = `Уровень ${levelId}`;

  const buttonsWrapper = document.createElement("div");
  buttonsWrapper.className = "topbar-buttons";

  const navButtons = document.createElement("div");
  navButtons.className = "topbar-nav-buttons";

  // ← Предыдущий: активен только для уровней 11–51 (уровни 1–9 отключены)
  const prevBtn = document.createElement("button");
  prevBtn.className = "topbar-prev";
  prevBtn.textContent = isCompactUI() ? "←" : "← Предыдущий";
  prevBtn.disabled = levelId <= 10;
  prevBtn.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    leaveLevel(() => NavigationService.navigate("game", () => startAntiLevel(root, levelId - 1), { replace: true }));
  });

  // Следующий →: активен для уровней 10–50 (максимум анти-уровней — 51)
  const nextBtn = document.createElement("button");
  nextBtn.className = "topbar-next";
  nextBtn.textContent = isCompactUI() ? "→" : "Следующий →";
  nextBtn.disabled = levelId >= 51;
  nextBtn.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    leaveLevel(() => NavigationService.navigate("game", () => startAntiLevel(root, levelId + 1), { replace: true }));
  });

  // Покинуть уровень: возврат на страницу выбора уровней (существующий экран)
  const leaveBtn = document.createElement("button");
  leaveBtn.className = "topbar-leave";
  leaveBtn.textContent = isCompactUI() ? "✕" : "Покинуть уровень";
  leaveBtn.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    leaveLevel(() => NavigationService.backTo("levelSelect"));
  });

  if (isCompactUI()) {
    // Мобильная раскладка: стрелки навигации + кнопка выхода
    navButtons.appendChild(prevBtn);
    navButtons.appendChild(nextBtn);
    buttonsWrapper.appendChild(navButtons);
    buttonsWrapper.appendChild(leaveBtn);

    topRow.appendChild(title);
    topRow.appendChild(buttonsWrapper);
  } else {
    // Десктопная раскладка: назад, уровень, вперёд, выход в одну строку
    topRow.appendChild(prevBtn);
    topRow.appendChild(title);
    topRow.appendChild(nextBtn);
    topRow.appendChild(leaveBtn);
  }

  // Очистка при уходе с экрана (браузерная/аппаратная кнопка «Назад»)
  NavigationService.setOnLeave(cleanupLevel);

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
    closeSocioMenuKeepSelection();
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
    closeSocioMenuKeepSelection();
    // Если клик пришёлся на доступную цель выбранного кота — не подавляем его:
    // окно закрылось, а то же нажатие передвинет кота на эту клетку.
    let isTargetClick = false;
    if (cell && selectedCatRC && game.selected) {
      const idx = Array.prototype.indexOf.call(cell.parentNode.children, cell);
      const r = Math.floor(idx / game.board.cols);
      const c = idx % game.board.cols;
      if (game.isTarget(r, c)) isTargetClick = true;
    }
    if (isTargetClick) {
      suppressNextBoardClick = false;
    } else {
      // Этот клик уже ушёл на поле — не даём ему передвинуть кота/выделить клетку
      suppressNextBoardClick = true;
      setTimeout(() => { suppressNextBoardClick = false; }, 50);
    }
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
      // Во время анимации ЗАКРЫТИЯ (closing) поле уже реагирует: клик по
      // соседней клетке тут же передвинет выделенного кота.
      if (!socioModal.hidden && !socioModalCard.classList.contains("closing")) return;
      // Клик, который только что закрыл окно, не должен двигать кота
      if (suppressNextBoardClick) return;
      // Клик по пустой клетке при выбранном коте снимает выбор, НО только если
      // это не доступный ход выбранного кота — иначе дальше clickCell
      // передвинет кота. Раньше resetCatSelection() обнулял game.selected даже
      // на доступном ходе, и кот с неизвестным типом ("?") не мог сделать ход.
      if (catState === "selected" && !game.board.isCat(r, c) && !game.isTarget(r, c)) {
        resetCatSelection();
        render();
      }
      // Клик по коту с известным социотипом (для неизвестных onCell не
      // вызывается — их обрабатывает onCatClick). Если это уже выбранный
      // кот — повторное нажатие ничего не делает. Если это другой кот —
      // выбор переключается на него (выделение идёт за нажатым котом).
      const tappedCatIndex = game.getCatIndex(r, c);
      if (tappedCatIndex !== null) {
        if (game.isSelected(r, c)) return;
        selectCat(tappedCatIndex, r, c);
        return;
      }
      audioManager.initAudioContext();
      const result = game.clickCell(r, c);
      if (result.needRedraw) {
        if (result.moved) {
          movesRemaining--;
          addTotalMoves(1); // общий счётчик ходов (адаптация royal-socio-cats)
          audioManager.playSoundEffect("assets/sounds/move.mp3");
          // Рамка выбора следует за котом на новую позицию
          selectedCatRC = { r, c };
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
    updateKingTracking();
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

  // Выбрать кота: установить рамку, доступные ходы и состояние выбора.
  // Используется и для котов с известным типом (клик в onCell), и для
  // котов с неизвестным типом (первое нажатие в onCatClick).
  function selectCat(catIndex, r, c) {
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
    selectCat(catIndex, r, c);
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

  // Закрыть меню социотипов, но оставить кота выделенным (рамка сохраняется).
  // После закрытия окна выделенный кот сразу может передвинуться на соседнюю
  // клетку — повторный выбор не нужен.
  function closeSocioMenuKeepSelection() {
    if (catState === "choosing") catState = "selected";
    hideSocioMenu();
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
      closeSocioMenuKeepSelection();
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
      levelRemainingMs += TIME_BONUS_HAPPY * 1000; // синхронизация нового счётчика
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
      levelRemainingMs += happy * 2 * 1000; // синхронизация нового счётчика
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
      // Фиксируем королей до очистки (для HUD)
      kingsAtWin = getKingsThisLevel();
      // Анти-фарм: в общий счёт королей/ракет идёт только прибавка над прошлым рекордом
      const prevBestKings = getBestKings(levelId);
      const kingsDelta = (prevBestKings === undefined)
        ? kingsAtWin
        : Math.max(0, kingsAtWin - prevBestKings);
      commitLevel(kingsDelta);
      cleanupLevel();
      // Короли: настроение >= 6
      let kings = 0;
      for (const cat of game.board.allCats()) {
        if (game.moodAt(cat.r, cat.c) >= KING_MOOD) kings++;
      }
      if (kings > 0) addBonusErrors(kings);
      updateStats();
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

  // ==== Отслеживание королей (адаптация royal-socio-cats: updateKingTracking) ====
  function getCurrentKings() {
    const kings = new Set();
    for (const cat of game.board.allCats()) {
      if (game.moodAt(cat.r, cat.c) >= KING_MOOD) {
        kings.add(`${cat.r},${cat.c}`);
      }
    }
    return kings;
  }

  function updateKingTracking() {
    const currentKings = getCurrentKings();
    const newKings = new Set();
    // Новые короли
    for (const key of currentKings) {
      if (!previousKings.has(key)) {
        onKingCreated();
        newKings.add(key);
      }
    }
    // Потерявшиеся короли
    for (const key of previousKings) {
      if (!currentKings.has(key)) {
        onKingLost();
      }
    }
    previousKings = currentKings;

    // Золотая вспышка для новых королей (стили golden-flash уже есть в cats.css)
    if (newKings.size > 0) {
      const cells = boardEl.querySelectorAll(".cell");
      for (const key of newKings) {
        const [r, c] = key.split(",").map(Number);
        const index = r * game.board.cols + c;
        if (cells[index]) {
          const flash = document.createElement("div");
          flash.className = "golden-flash";
          cells[index].appendChild(flash);
          flash.addEventListener("animationend", () => {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
          });
        }
      }
    }
    return newKings;
  }

  // Форматирование времени (адаптация formatTime из royal-socio-cats)
  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  // ==== Обновление HUD ====
  function updateStats() {
    const seconds = Math.max(0, Math.ceil(timeRemaining));
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");

    // Довольные/недовольные/максимум довольных (из royal-socio-cats)
    let happy = 0;
    let unhappy = 0;
    for (const cat of game.board.allCats()) {
      if (game.moodAt(cat.r, cat.c) >= 1) happy++;
      else unhappy++;
    }
    if (!maxHappyInitialized) {
      maxHappyCats = happy;
      maxHappyInitialized = true;
    } else if (happy > maxHappyCats) {
      maxHappyCats = happy;
    }

    const movesMade = game.getMoveCount();
    const kingsCount = won ? kingsAtWin : getKingsThisLevel();
    const rocketsCount = getRockets();
    const canUseRocket = rocketsCount > 0 && !won && !impeached;
    const rocketBtnClass = `rocket-btn ${!canUseRocket ? "rocket-btn-disabled" : ""}`;

    stats.innerHTML = `
      <div class="stat-item">🎯 Ходы: осталось | сделано (${movesRemaining}/${movesMade})</div>
      <div class="stat-item">⏱️ Время: осталось ${formatTime(levelRemainingMs)}</div>
      <div class="stat-item">⏰ На уровне: ${formatTime(elapsedMs)}</div>
      <div class="stat-item">😊 Довольные: ${happy}</div>
      <div class="stat-item">😾 Недовольные: ${unhappy}</div>
      <div class="stat-item">⭐ Макс. довольных: ${maxHappyCats}</div>
      <div class="stat-item">👑 Короли: ${kingsCount}</div>
      <div class="stat-item">⏱ Время [AK]: ${mm}:${ss}</div>
      <div class="stat-item"> Ходы [AK]: ${movesRemaining}</div>
      <div class="stat-item">❌ Ошибки: ${errorsMade} | Осталось: ${currentErrorsRemaining}</div>
      <div class="stat-item">😊 Угадано: ${game.getGuessedCount()}/${level.cats.length}</div>
      <button class="${rocketBtnClass}" id="rocket-btn" ${!canUseRocket ? "disabled" : ""}>🚀 Ракеты: ${rocketsCount}</button>
    `;
  }

  // ==== Ракета (адаптация royal-socio-cats: useRocket + showRocketBoost) ====
  function useRocket() {
    if (won || impeached) return;
    if (!spendRocket()) return;
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    startTimer();                // таймер счётчиков стартует и по клику на ракету
    movesRemaining += 10;        // +10 ходов
    levelRemainingMs += 20_000;  // +20 сек
    timeRemaining += 20;         // синхронизация с существующим счётчиком AK
    updateStats();
    showRocketBoost();
  }

  function showRocketBoost() {
    const items = Array.from(stats.querySelectorAll(".stat-item"));
    const find = (word) => items.find((el) => el.textContent.includes(word));
    const targets = [
      { el: find("Ходы"), text: "+10 ходов" },
      { el: find("Время"), text: "+20 сек" },
      { el: find("Ракеты"), text: "-1 🚀" },
    ];
    for (const t of targets) {
      if (!t.el) continue;
      const rect = t.el.getBoundingClientRect();
      const glow = document.createElement("div");
      glow.className = "boost-glow";
      glow.style.left = rect.left + "px";
      glow.style.top = rect.top + "px";
      glow.style.width = rect.width + "px";
      glow.style.height = rect.height + "px";
      document.body.appendChild(glow);
      glow.addEventListener("animationend", () => glow.remove());
      const float = document.createElement("div");
      float.className = "boost-float";
      float.textContent = t.text;
      float.style.left = (rect.left + rect.width / 2) + "px";
      float.style.top = rect.top + "px";
      document.body.appendChild(float);
      float.addEventListener("animationend", () => float.remove());
    }
    const rocket = document.createElement("div");
    rocket.className = "rocket-fly-big";
    rocket.textContent = "🚀";
    boardArea.appendChild(rocket);
    rocket.addEventListener("animationend", () => rocket.remove());
    boardArea.classList.add("screen-shake");
    boardArea.addEventListener("animationend", () => boardArea.classList.remove("screen-shake"), { once: true });
  }

  // Один слушатель на весь блок статистики — переживает перерисовку кнопки
  // (updateStats перезаписывает innerHTML при каждом обновлении).
  let lastRocketPointerTime = 0;
  stats.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest("#rocket-btn")) {
      lastRocketPointerTime = Date.now();
      useRocket();
    }
  });
  stats.addEventListener("click", (e) => {
    if (e.target.closest("#rocket-btn")) {
      if (Date.now() - lastRocketPointerTime > 500) useRocket();
    }
  });

  // ==== Таймер дополнительных счётчиков (⏰ На уровне, ⏱️ Время осталось) ====
  function startRoyalTimer() {
    if (royalTimerId !== null) return;
    royalTimerId = setInterval(() => {
      if (!levelActive || won || impeached) return;
      elapsedMs = Date.now() - levelStartTime;
      levelRemainingMs = Math.max(0, levelRemainingMs - 200);
      updateStats();
    }, 200);
  }

  // ==== Таймер ====
  function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
    startRoyalTimer();
    timerId = setInterval(() => {
      if (!levelActive || won || impeached) return;
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        levelRemainingMs = 0;
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
    if (royalTimerId !== null) { clearInterval(royalTimerId); royalTimerId = null; }
    // Копим общее время игры (адаптация addTotalTime из royal-socio-cats)
    if (!levelCleaned) {
      levelCleaned = true;
      elapsedMs = Date.now() - levelStartTime;
      addTotalTime(elapsedMs);
    }
    stopBoardLayoutListener();
    document.removeEventListener("keydown", onModalKeyDown);
    document.removeEventListener("pointerdown", onDocPointerDown);
    window.removeEventListener("resize", onViewportResize);
    window.visualViewport?.removeEventListener("resize", onViewportResize);
  }

  // Возврат на экран выбора уровней (используется в оверлеях победы/импичмента
  // и раньше была кнопкой «Меню»). Используется существующая навигация.
  function showMenu() {
    leaveLevel(() => NavigationService.backTo("levelSelect"));
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