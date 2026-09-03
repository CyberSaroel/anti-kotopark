const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'js', 'core', 'version.js');
const indexFile = path.join(__dirname, '..', 'index.html');
const swFile = path.join(__dirname, '..', 'sw.js');

if (process.argv.length < 3) {
  console.error('Usage: node tools/bumpVersion.js <version>');
  process.exit(1);
}

const newVersion = process.argv[2];

// Update version.js
const versionContent = `export const VERSION = "${newVersion}";

const STORAGE_KEY = "ak_version";

// Устаревший ключ старого хранилища (royal-socio-cats). Разовая миграция
// при чтении: если новый ключ пуст, а старый — нет, берём значение из
// старого и сразу сохраняем под новым ключом.
const LEGACY_STORAGE_KEY = "socio-cats:version";

function migrateFromLegacy() {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) localStorage.setItem(STORAGE_KEY, legacy);
  } catch (e) {
    // ignore
  }
}

export function saveVersion() {
  try {
    localStorage.setItem(STORAGE_KEY, VERSION);
  } catch (e) {
    // ignore
  }
}

export function getSavedVersion() {
  try {
    migrateFromLegacy();
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}`;

fs.writeFileSync(versionFile, versionContent, 'utf8');
console.log(`Updated js/core/version.js to version ${newVersion}`);

// Update index.html
let indexContent = fs.readFileSync(indexFile, 'utf8');
indexContent = indexContent.replace(/js\/app\.js\?v=[^"]*"/, `js/app.js?v=${newVersion}"`);
indexContent = indexContent.replace(/href="([^"]+\.css)(?:\?v=[^"]*)?"/g, `href="$1?v=${newVersion}"`);
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log(`Updated index.html to version ${newVersion}`);

// Update sw.js
let swContent = fs.readFileSync(swFile, 'utf8');
swContent = swContent.replace(/const VERSION = "[^"]*";/, `const VERSION = "${newVersion}";`);
fs.writeFileSync(swFile, swContent, 'utf8');
console.log(`Updated sw.js to version ${newVersion}`);

console.log('Done!');
