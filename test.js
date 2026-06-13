const fs = require('fs');
const path = require('path');
let html = fs.readFileSync('electron/presentation_prelist.html', 'utf-8');
const ltScript = fs.readFileSync('electron/lower_third.js', 'utf-8');
html = html.replace('<script src="lower_third.js"></script>', `<script>\n${ltScript}\n</script>`);
console.log(html.includes('function resetToFullscreenLayout'));
