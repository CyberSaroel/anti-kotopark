const KINGS_STORAGE_KEY = "socio-cats:kingsTotal";
const ROCKETS_STORAGE_KEY = "socio-cats:rockets";

let kingsThisLevel = 0;
let kingsTotal = 0;
let rockets = 0;

// Load from localStorage
function loadFromStorage() {
  try {
    const storedKings = localStorage.getItem(KINGS_STORAGE_KEY);
    kingsTotal = storedKings ? parseInt(storedKings, 10) : 0;

    const storedRockets = localStorage.getItem(ROCKETS_STORAGE_KEY);
    rockets = storedRockets ? parseInt(storedRockets, 10) : 0;
  } catch (e) {
    kingsTotal = 0;
    rockets = 0;
  }
}

// Save to localStorage
function saveToStorage() {
  try {
    localStorage.setItem(KINGS_STORAGE_KEY, String(kingsTotal));
    localStorage.setItem(ROCKETS_STORAGE_KEY, String(rockets));
  } catch (e) {
    // Ignore storage errors
  }
}

// Initialize on module load
loadFromStorage();

/**
 * Called when a cat becomes a king
 */
export function onKingCreated() {
  kingsThisLevel++;
}

/**
 * Called when a cat stops being a king
 */
export function onKingLost() {
  if (kingsThisLevel > 0) {
    kingsThisLevel--;
  }
}

/**
 * Commit kingsThisLevel to kingsTotal and add rockets (called on level victory)
 */
export function commitLevel(amountToAdd) {
  // amountToAdd — сколько королей реально засчитать в общий счёт.
  // Если аргумент не передали — ведём себя как раньше (страховка).
  const add = (amountToAdd === undefined) ? kingsThisLevel : amountToAdd;
  rockets += add;
  kingsTotal += add;
  saveToStorage();
  kingsThisLevel = 0; // Reset to prevent double counting
}

/**
 * Reset kingsThisLevel (called on level restart/fail)
 */
export function resetLevel() {
  kingsThisLevel = 0;
}

/**
 * Get current kingsThisLevel count
 */
export function getKingsThisLevel() {
  return kingsThisLevel;
}

/**
 * Get total kings count
 */
export function getKingsTotal() {
  return kingsTotal;
}

/**
 * Get current rockets count
 */
export function getRockets() {
  return rockets;
}

/**
 * Spend a rocket, returns true if successful
 */
export function spendRocket() {
  if (rockets > 0) {
    rockets--;
    saveToStorage();
    return true;
  }
  return false;
}
