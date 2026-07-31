let resizeHandler = null;
let viewportTarget = null;

function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight
  };
}

function getReservedHeight() {
  const topbar = document.querySelector(".topbar");
  const hud = document.querySelector(".game-hud");
  const topbarH = topbar?.offsetHeight ?? 0;
  const hudH = hud?.offsetHeight ?? 0;
  const audioBar = document.querySelector(".mobile-audio-bar");
  const audioH = audioBar?.offsetHeight ?? 0;
  return topbarH + hudH + audioH + 24;
}

export function fitBoardToViewport(boardEl, rows, cols) {
  viewportTarget = boardEl;

  const apply = () => {
    if (!viewportTarget) return;

    const { width, height } = getViewportSize();
    const gap = 4;
    const horizontalPad = 12;
    const reservedHeight = getReservedHeight();
    const maxW = width - horizontalPad * 2;
    const maxH = Math.max(160, height - reservedHeight);

    const byWidth = Math.floor((maxW - gap * (cols - 1)) / cols);
    const byHeight = Math.floor((maxH - gap * (rows - 1)) / rows);
    const cellW = Math.min(90, Math.max(36, Math.min(byWidth, byHeight)));
    const cellH = Math.floor(cellW * 1.1);
    const catSize = Math.max(22, Math.floor(cellW * 0.74));
    const labelSize = cellW < 48 ? 8 : cellW < 60 ? 10 : cellW < 72 ? 11 : 13;
    const outline = Math.max(2, Math.round(cellW * 0.035));

    viewportTarget.style.setProperty("--cell-w", `${cellW}px`);
    viewportTarget.style.setProperty("--cell-h", `${cellH}px`);
    viewportTarget.style.setProperty("--cat-size", `${catSize}px`);
    viewportTarget.style.setProperty("--cell-font-size", `${labelSize}px`);
    viewportTarget.style.setProperty("--cell-outline", `${outline}px`);
  };

  apply();

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    window.visualViewport?.removeEventListener("resize", resizeHandler);
    window.visualViewport?.removeEventListener("scroll", resizeHandler);
  }

  resizeHandler = apply;
  window.addEventListener("resize", resizeHandler);
  window.visualViewport?.addEventListener("resize", resizeHandler);
  window.visualViewport?.addEventListener("scroll", resizeHandler);
}

export function refitBoard() {
  if (resizeHandler) resizeHandler();
}

export function stopBoardLayoutListener() {
  viewportTarget = null;
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    window.visualViewport?.removeEventListener("resize", resizeHandler);
    window.visualViewport?.removeEventListener("scroll", resizeHandler);
    resizeHandler = null;
  }
}
