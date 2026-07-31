import { fetchManifest } from "../levels/levelLoader.js";
import { isCompleted } from "../levels/levelProgress.js";
import { getBestMoveCount } from "../levels/levelRecords.js";
import { showGameScreen } from "./gameScreen.js";
import { showSkinSelect } from "./skinSelect.js";
import { showSettingsScreen } from "./settingsScreen.js";
import { showVictorySoundSelect } from "./victorySoundSelect.js";
import { showRecordsScreen } from "./recordsScreen.js";
import { audioManager } from "../core/audioManager.js";
import { mountFloatingAudioControls } from "../ui/floatingAudioControls.js";
import NavigationService from "../core/navigation.js";

export async function showLevelSelect(root) {
  root.innerHTML = "";
  root.className = "";
  mountFloatingAudioControls(document.body);

  const h = document.createElement("h1");
  h.textContent = "Соционические коты";
  root.appendChild(h);

  const p = document.createElement("p");
  p.textContent = "Выберите уровень";
  root.appendChild(p);

  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "menu-buttons";

  // const skinBtn = document.createElement("button");
  // skinBtn.className = "skin-btn";
  // skinBtn.textContent = "🎨 Скины";
  // skinBtn.addEventListener("click", () => showSkinSelect(root));
  // buttonsDiv.appendChild(skinBtn);

  const settingsBtn = document.createElement("button");
  settingsBtn.className = "theme-btn";
  settingsBtn.textContent = "⚙️ Настройки";
  settingsBtn.addEventListener("click", () => {
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.navigate("settings", () => showSettingsScreen(root));
  });
  buttonsDiv.appendChild(settingsBtn);

  const victorySoundBtn = document.createElement("button");
  victorySoundBtn.className = "victory-sound-btn";
  victorySoundBtn.textContent = "🎶 Звук победы";
  victorySoundBtn.addEventListener("click", () => {
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.navigate("victorySoundSelect", () => showVictorySoundSelect(root));
  });
  buttonsDiv.appendChild(victorySoundBtn);

  const recordsBtn = document.createElement("button");
  recordsBtn.className = "records-btn";
  recordsBtn.textContent = "🏆 Рекорды и статистика";
  recordsBtn.addEventListener("click", () => {
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.navigate("records", () => showRecordsScreen(root));
  });
  buttonsDiv.appendChild(recordsBtn);

  // Exit to main menu button
  const exitBtn = document.createElement("button");
  exitBtn.className = "theme-btn";
  exitBtn.textContent = "🚪 Выход в главное меню";
  exitBtn.addEventListener("click", () => {
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.goHome();
  });
  buttonsDiv.appendChild(exitBtn);

  root.appendChild(buttonsDiv);

  const grid = document.createElement("div");
  grid.id = "level-grid";
  root.appendChild(grid);

  let manifest;
  try {
    manifest = await fetchManifest();
  } catch (e) {
    p.textContent = e.message;
    return;
  }

  for (const lvl of manifest.levels) {
    const btn = document.createElement("button");
    btn.className = "level-btn" + (isCompleted(lvl.id) ? " done" : "");
    
    const bestMove = getBestMoveCount(lvl.id);
    
    const content = document.createElement("div");
    content.className = "level-btn-content";
    
    const levelNum = document.createElement("span");
    levelNum.className = "level-num";
    levelNum.textContent = lvl.id;
    content.appendChild(levelNum);
    
    if (bestMove !== undefined) {
      const trophy = document.createElement("span");
      trophy.className = "level-trophy";
      trophy.textContent = "🏆";
      content.appendChild(trophy);
      
      const moves = document.createElement("span");
      moves.className = "level-moves";
      moves.textContent = bestMove;
      content.appendChild(moves);
    }
    
    btn.appendChild(content);
    btn.title = lvl.name || ("Уровень " + lvl.id);
    btn.addEventListener("click", () => {
      audioManager.playSoundEffect("assets/sounds/click.mp3");
      NavigationService.navigate("game", () => showGameScreen(root, lvl.id));
    });
    grid.appendChild(btn);
  }

  NavigationService.saveCurrentRender(() => showLevelSelect(root));
}
