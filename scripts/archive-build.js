const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const VERSION_JSON_PATH = path.join(ROOT_DIR, 'version.json');
const BUILD_BIN_DIR = path.join(ROOT_DIR, 'build', 'bin');
const UPDATER_BIN_PATH = path.join(ROOT_DIR, 'internal', 'updater', 'bin', 'updater.exe');
const RELEASES_DIR = path.join(ROOT_DIR, 'releases');

// 1. Read current version
let version = '2.0.1';
let appName = 'Internal Tool API';

if (fs.existsSync(VERSION_JSON_PATH)) {
  try {
    const vData = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
    if (vData.version) version = vData.version.replace(/^v/, '');
    if (vData.name) appName = vData.name;
  } catch (err) {}
}

const majorNumber = version.split('.')[0] || '2';
const majorFolder = `v${majorNumber}`;
const subVersionFolder = `v${version}`;
const targetDir = path.join(RELEASES_DIR, majorFolder, subVersionFolder);

// Ensure major and subversion directory exists
fs.mkdirSync(targetDir, { recursive: true });

console.log('====================================================');
console.log(`📦 ARCHIVING BUILD TO: releases/${majorFolder}/${subVersionFolder}`);
console.log('====================================================');

// 2. Find and archive the built executable in build/bin
if (fs.existsSync(BUILD_BIN_DIR)) {
  const standardName = `Internal Tool API_v${version}.exe`;
  const exactPath = path.join(BUILD_BIN_DIR, standardName);

  if (fs.existsSync(exactPath)) {
    const dest = path.join(targetDir, standardName);
    fs.copyFileSync(exactPath, dest);
    console.log(`✅ Archived: releases/${majorFolder}/${subVersionFolder}/${standardName}`);
  } else {
    // Fallback if named differently by wails
    const files = fs.readdirSync(BUILD_BIN_DIR);
    for (const file of files) {
      if (file.endsWith('.exe') && file !== 'updater.exe') {
        const src = path.join(BUILD_BIN_DIR, file);
        const dest = path.join(targetDir, standardName);
        fs.copyFileSync(src, dest);
        console.log(`✅ Archived: releases/${majorFolder}/${subVersionFolder}/${standardName}`);
        break;
      }
    }
  }
}

// 3. Copy updater if exists
if (fs.existsSync(UPDATER_BIN_PATH)) {
  const updaterDest = path.join(targetDir, 'updater.exe');
  fs.copyFileSync(UPDATER_BIN_PATH, updaterDest);
  console.log(`✅ Archived: releases/${majorFolder}/${subVersionFolder}/updater.exe`);
}

// 4. Save build metadata
const metaPath = path.join(targetDir, 'metadata.json');
const meta = {
  appName: 'Internal Tool API',
  majorVersion: majorFolder,
  version: subVersionFolder,
  executableName: `Internal Tool API_v${version}.exe`,
  archivedAt: new Date().toISOString(),
  files: fs.readdirSync(targetDir)
};
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');

console.log(`📂 Version archive preserved at: releases/${majorFolder}/${subVersionFolder}/`);
console.log('====================================================');
