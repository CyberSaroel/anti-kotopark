import { getSelectedSkin } from "../screens/skinSelect.js";
import { fitBoardToViewport } from "./boardLayout.js";
import { bindCellInteraction } from "../ui/cellInteraction.js";
import { getTypeDisplayName } from "../socionics/types.js";

let skinPath = null;
let imagesPreloaded = false;

function preloadCatImages() {
  if (imagesPreloaded || !skinPath) return;
  imagesPreloaded = true;
  for (let m = -6; m <= 6; m++) {
    const pre = new Image();
    pre.src = skinPath.replace("{mood}", m);
  }
}

async function loadSkinPath() {
  try {
    const res = await fetch("json/data/skins.json");
    if (!res.ok) return "assets/cats/mood_{mood}.png";
    const data = await res.json();
    const skinId = getSelectedSkin();
    const skin = data.skins.find(s => s.id === skinId);
    return skin ? skin.path : data.skins[0].path;
  } catch {
    return "assets/cats/mood_{mood}.png";
  }
}

// Render board for Anti-Kotopark mode with cat numbers and sociotype display
export async function renderAntiBoard(container, game, onCell, onCatClick) {
  if (!skinPath) skinPath = await loadSkinPath();
  preloadCatImages();

  const board = game.board;
  container.innerHTML = "";
  container.style.setProperty("--rows", board.rows);
  container.style.setProperty("--cols", board.cols);

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (board.isWater(r, c)) cell.classList.add("water");
      else if (board.isEmpty(r, c)) cell.classList.add("empty");

      if (game.isSelected(r, c)) cell.classList.add("selected");
      if (game.isTarget(r, c)) cell.classList.add("target");

      if (board.isCat(r, c)) {
        const mood = game.moodAt(r, c);
        cell.dataset.mood = String(mood);
        
        const catNum = game.getCatNumber(r, c);
        const catIndex = game.getCatIndex(r, c);
        
        // Cat image
        const img = document.createElement("img");
        img.className = "cat";
        const imgUrl = skinPath.replace("{mood}", mood);
        img.src = imgUrl;
        img.alt = String(mood);
        
        // Cat number in top-right corner
        const numberBadge = document.createElement("div");
        numberBadge.className = "cat-number";
        numberBadge.textContent = catNum;
        
        // Sociotype display (or ? for unknown) at bottom
        const typeLabel = document.createElement("div");
        typeLabel.className = "cat-type-label";
        
        if (game.isTypeKnown(catIndex)) {
          const typeName = game.getGuessedType(catIndex);
          typeLabel.textContent = getTypeDisplayName(typeName);
          typeLabel.classList.add("known");
        } else {
          typeLabel.textContent = "?";
          typeLabel.classList.add("unknown");
        }
        
        cell.appendChild(img);
        cell.appendChild(numberBadge);
        cell.appendChild(typeLabel);
        
        // Make cat clickable for type selection
        cell.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onCatClick && catIndex !== null && !game.isTypeKnown(catIndex)) {
            onCatClick(catIndex, r, c);
          }
        });
      }

      const rr = r, cc = c;
      bindCellInteraction(cell, () => onCell(rr, cc));
      container.appendChild(cell);
    }
  }

  fitBoardToViewport(container, board.rows, board.cols);
}

export function resetSkinCache() {
  skinPath = null;
  imagesPreloaded = false;
}
