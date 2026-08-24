const fs = require('fs');
const filePath = 'js/screens/gameScreen.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('🚀 Ракеты', '🐠 Ракеты');
fs.writeFileSync(filePath, content);
console.log('Fixed');
