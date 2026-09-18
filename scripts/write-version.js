// scripts/write-version.js
const fs = require('fs');
const path = require('path');

const version = process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || Date.now().toString();

const outDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
    path.join(outDir, 'version.json'),
    JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2)
);

console.log('Wrote version.json:', version);