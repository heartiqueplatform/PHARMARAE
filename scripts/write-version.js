// scripts/write-version.js
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const version = pkg.version || '1.0.0';
const buildTime = Date.now();

// 1. Write version.json
const versionPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(
    versionPath,
    JSON.stringify({ version, buildTime }, null, 2)
);
console.log(`✅ version.json → ${version}`);

// 2. Bump APP_VERSION in sw.js
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(
    /const APP_VERSION = '[\d.]+';/,
    `const APP_VERSION = '${version}';`
);
fs.writeFileSync(swPath, sw);
console.log(` sw.js APP_VERSION → ${version}`);