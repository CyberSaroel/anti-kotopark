import { showRulesScreen } from "./rulesScreen.js";
import { showSettingsScreen } from "./settingsScreen.js";
import { showStatsScreen } from "./statsScreen.js";
import { showAntiGameScreen } from "./antiGameScreen.js";
import { audioManager, isMusicEnabled, setMusicEnabled, isSfxEnabled, setSfxEnabled, getMusicVolume, setMusicVolume, getSfxVolume, setSfxVolume } from "../core/audioManager.js";
import NavigationService from "../core/navigation.js";
import { removeFloatingAudioControls } from "../ui/floatingAudioControls.js";

export function showIntroScreen(root) {
  root.innerHTML = "";
  removeFloatingAudioControls();

  const overlay = document.createElement("div");
  overlay.id = "intro-screen";

  const introImg = document.createElement("img");
  introImg.src = "assets/intro/intro.png";
  introImg.alt = "Соционические коты";
  introImg.className = "intro-image";

  // Заголовок "СОБЕРИ ВСЕХ КОРОЛЕЙ"
  const titleImage = document.createElement("img");
  titleImage.src = "assets/intro/title.png";
  titleImage.alt = "СОБЕРИ ВСЕХ КОРОЛЕЙ";
  titleImage.className = "intro-title-image";

  const startBtn = document.createElement("button");
  startBtn.className = "intro-start-btn";
  startBtn.textContent = "🎮 Начать игру";
  startBtn.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.navigate("antiGame", () => showAntiGameScreen(root));
  });

  // Rules button
  const rulesBtn = document.createElement("button");
  rulesBtn.className = "intro-music-btn";
  rulesBtn.textContent = "📖 Правила игры";
  rulesBtn.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.navigate("rules", () => showRulesScreen(root));
  });

  // Settings button
  const settingsBtn = document.createElement("button");
  settingsBtn.className = "intro-music-btn";
  settingsBtn.textContent = "⚙️ Настройки";
  settingsBtn.addEventListener("click", () => {
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    NavigationService.navigate("settings", () => showSettingsScreen(root));
  });

  // Wrapper for music controls
  const musicWrapper = document.createElement("div");
  musicWrapper.style.position = "relative";
  musicWrapper.style.display = "inline-block";

  const musicBtn = document.createElement("button");
  musicBtn.className = "intro-music-btn";
  const musicIcon = document.createElement("span");
  musicIcon.textContent = "🎵";
  musicIcon.style.textDecoration = isMusicEnabled() ? "none" : "line-through";
  musicIcon.style.opacity = isMusicEnabled() ? "1" : "0.5";
  const musicText = document.createElement("span");
  musicText.textContent = isMusicEnabled() ? " Музыка: Вкл" : " Музыка: Выкл";
  musicBtn.appendChild(musicIcon);
  musicBtn.appendChild(musicText);
  musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    const enabled = !isMusicEnabled();
    setMusicEnabled(enabled);
    musicIcon.textContent = "🎵";
    musicIcon.style.textDecoration = enabled ? "none" : "line-through";
    musicIcon.style.opacity = enabled ? "1" : "0.5";
    musicText.textContent = enabled ? " Музыка: Вкл" : " Музыка: Выкл";
    if (enabled) {
      audioManager.play("assets/music/background.mp3");
    } else {
      audioManager.stop();
    }
  });

  // Volume popup for music
  const musicVolumePopup = document.createElement("div");
  musicVolumePopup.style.position = "absolute";
  musicVolumePopup.style.top = "0";
  musicVolumePopup.style.right = "100%";
  musicVolumePopup.style.background = "transparent";
  musicVolumePopup.style.padding = "10px";
  musicVolumePopup.style.zIndex = "1000";
  musicVolumePopup.style.display = "none";
  musicVolumePopup.style.marginRight = "5px";

  const musicVolumeLabel = document.createElement("label");
  musicVolumeLabel.textContent = "Громкость";
  musicVolumeLabel.style.display = "block";
  musicVolumeLabel.style.marginBottom = "5px";
  musicVolumeLabel.style.fontSize = "12px";
  musicVolumeLabel.style.color = "#333";
  
  const musicVolumeSlider = document.createElement("input");
  musicVolumeSlider.type = "range";
  musicVolumeSlider.min = "0";
  musicVolumeSlider.max = "1";
  musicVolumeSlider.step = "0.01";
  musicVolumeSlider.value = getMusicVolume();
  musicVolumeSlider.style.width = "150px";
  musicVolumeSlider.addEventListener("input", (e) => {
    const volume = parseFloat(e.target.value);
    setMusicVolume(volume);
    audioManager.updateMusicVolume();
  });

  // Prevent event propagation for music volume controls
  const preventPropagation = (e) => {
    e.stopPropagation();
  };
  musicVolumePopup.addEventListener("click", preventPropagation);
  musicVolumePopup.addEventListener("mousedown", preventPropagation);
  musicVolumePopup.addEventListener("mouseup", preventPropagation);
  musicVolumePopup.addEventListener("touchstart", preventPropagation);
  musicVolumePopup.addEventListener("touchend", preventPropagation);
  musicVolumeLabel.addEventListener("click", preventPropagation);
  musicVolumeLabel.addEventListener("mousedown", preventPropagation);
  musicVolumeLabel.addEventListener("mouseup", preventPropagation);
  musicVolumeLabel.addEventListener("touchstart", preventPropagation);
  musicVolumeLabel.addEventListener("touchend", preventPropagation);
  musicVolumeSlider.addEventListener("click", preventPropagation);
  musicVolumeSlider.addEventListener("mousedown", preventPropagation);
  musicVolumeSlider.addEventListener("mouseup", preventPropagation);
  musicVolumeSlider.addEventListener("touchstart", preventPropagation);
  musicVolumeSlider.addEventListener("touchend", preventPropagation);

  musicVolumePopup.appendChild(musicVolumeLabel);
  musicVolumePopup.appendChild(musicVolumeSlider);
  musicBtn.style.position = "relative";
  musicBtn.appendChild(musicVolumePopup);

  // Add button and popup to wrapper
  musicWrapper.appendChild(musicBtn);

  // Add mouse events to wrapper with delay
  let musicHideTimeout;
  musicWrapper.addEventListener("mouseenter", () => {
    if (musicHideTimeout) {
      clearTimeout(musicHideTimeout);
      musicHideTimeout = null;
    }
    musicVolumePopup.style.display = "block";
  });
  musicWrapper.addEventListener("mouseleave", () => {
    musicHideTimeout = setTimeout(() => {
      musicVolumePopup.style.display = "none";
    }, 300);
  });

  const controls = document.createElement("div");
  controls.className = "intro-controls";
  controls.appendChild(startBtn);
  controls.appendChild(rulesBtn);
  controls.appendChild(settingsBtn);
  controls.appendChild(musicWrapper);

  // Wrapper for SFX controls
  const sfxWrapper = document.createElement("div");
  sfxWrapper.style.position = "relative";
  sfxWrapper.style.display = "inline-block";

  const sfxBtn = document.createElement("button");
  sfxBtn.className = "intro-music-btn";
  const sfxIcon = document.createElement("span");
  sfxIcon.textContent = "🔊";
  sfxIcon.style.textDecoration = isSfxEnabled() ? "none" : "line-through";
  sfxIcon.style.opacity = isSfxEnabled() ? "1" : "0.5";
  const sfxText = document.createElement("span");
  sfxText.textContent = isSfxEnabled() ? " Звуковые эффекты: Вкл" : " Звуковые эффекты: Выкл";
  sfxBtn.appendChild(sfxIcon);
  sfxBtn.appendChild(sfxText);
  sfxBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    audioManager.initAudioContext();
    audioManager.playSoundEffect("assets/sounds/click.mp3");
    const enabled = !isSfxEnabled();
    setSfxEnabled(enabled);
    sfxIcon.textContent = "🔊";
    sfxIcon.style.textDecoration = enabled ? "none" : "line-through";
    sfxIcon.style.opacity = enabled ? "1" : "0.5";
    sfxText.textContent = enabled ? " Звуковые эффекты: Вкл" : " Звуковые эффекты: Выкл";
  });

  // Volume popup for SFX
  const sfxVolumePopup = document.createElement("div");
  sfxVolumePopup.style.position = "absolute";
  sfxVolumePopup.style.top = "0";
  sfxVolumePopup.style.right = "100%";
  sfxVolumePopup.style.background = "transparent";
  sfxVolumePopup.style.padding = "10px";
  sfxVolumePopup.style.zIndex = "1000";
  sfxVolumePopup.style.display = "none";
  sfxVolumePopup.style.marginRight = "5px";

  const sfxVolumeLabel = document.createElement("label");
  sfxVolumeLabel.textContent = "Громкость";
  sfxVolumeLabel.style.display = "block";
  sfxVolumeLabel.style.marginBottom = "5px";
  sfxVolumeLabel.style.fontSize = "12px";
  sfxVolumeLabel.style.color = "#333";
  
  const sfxVolumeSlider = document.createElement("input");
  sfxVolumeSlider.type = "range";
  sfxVolumeSlider.min = "0";
  sfxVolumeSlider.max = "1";
  sfxVolumeSlider.step = "0.01";
  sfxVolumeSlider.value = getSfxVolume();
  sfxVolumeSlider.style.width = "150px";
  sfxVolumeSlider.addEventListener("input", (e) => {
    const volume = parseFloat(e.target.value);
    setSfxVolume(volume);
    audioManager.updateSfxVolume();
  });

  // Prevent event propagation for SFX volume controls
  sfxVolumePopup.addEventListener("click", preventPropagation);
  sfxVolumePopup.addEventListener("mousedown", preventPropagation);
  sfxVolumePopup.addEventListener("mouseup", preventPropagation);
  sfxVolumePopup.addEventListener("touchstart", preventPropagation);
  sfxVolumePopup.addEventListener("touchend", preventPropagation);
  sfxVolumeLabel.addEventListener("click", preventPropagation);
  sfxVolumeLabel.addEventListener("mousedown", preventPropagation);
  sfxVolumeLabel.addEventListener("mouseup", preventPropagation);
  sfxVolumeLabel.addEventListener("touchstart", preventPropagation);
  sfxVolumeLabel.addEventListener("touchend", preventPropagation);
  sfxVolumeSlider.addEventListener("click", preventPropagation);
  sfxVolumeSlider.addEventListener("mousedown", preventPropagation);
  sfxVolumeSlider.addEventListener("mouseup", preventPropagation);
  sfxVolumeSlider.addEventListener("touchstart", preventPropagation);
  sfxVolumeSlider.addEventListener("touchend", preventPropagation);

  sfxVolumePopup.appendChild(sfxVolumeLabel);
  sfxVolumePopup.appendChild(sfxVolumeSlider);
  sfxBtn.style.position = "relative";
  sfxBtn.appendChild(sfxVolumePopup);

  // Add button and popup to wrapper
  sfxWrapper.appendChild(sfxBtn);

  // Add mouse events to wrapper with delay
  let sfxHideTimeout;
  sfxWrapper.addEventListener("mouseenter", () => {
    if (sfxHideTimeout) {
      clearTimeout(sfxHideTimeout);
      sfxHideTimeout = null;
    }
    sfxVolumePopup.style.display = "block";
  });
  sfxWrapper.addEventListener("mouseleave", () => {
    sfxHideTimeout = setTimeout(() => {
      sfxVolumePopup.style.display = "none";
    }, 300);
  });

  controls.appendChild(sfxWrapper);

  const hero = document.createElement("div");
  hero.className = "intro-hero";
  hero.appendChild(introImg);
  hero.appendChild(titleImage);
  hero.appendChild(controls);

  overlay.appendChild(hero);
  root.appendChild(overlay);

  NavigationService.saveCurrentRender(() => showIntroScreen(root));
}
