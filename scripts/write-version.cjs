// scripts/write-version.cjs
const fs = require('fs');
const path = require('path');

const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    Date.now().toString();

const publicDir = path.join(__dirname, '..', 'public');

// 1. Write version.json (for the app to poll)
const versionFile = path.join(publicDir, 'version.json');
fs.writeFileSync(
    versionFile,
    JSON.stringify({ version, buildTime: Date.now() }, null, 2)
);
console.log('✅ Wrote version.json →', version);

// 2. Stamp the SW with the same version
const swPath = path.join(publicDir, 'sw.js');
if (fs.existsSync(swPath)) {
    let sw = fs.readFileSync(swPath, 'utf8');
    // Replace the APP_VERSION constant line
    sw = sw.replace(
        /const APP_VERSION = ['"][^'"]*['"];/,
        `const APP_VERSION = '${version}';`
    );
    fs.writeFileSync(swPath, sw);
    console.log('✅ Stamped sw.js APP_VERSION →', version);
}
