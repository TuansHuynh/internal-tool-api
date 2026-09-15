const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const VERSION_JSON_PATH = path.join(ROOT_DIR, 'version.json');
const BUILD_BIN_DIR = path.join(ROOT_DIR, 'build', 'bin');
const UPDATER_BIN_PATH = path.join(ROOT_DIR, 'internal', 'updater', 'bin', 'updater.exe');
const RELEASES_DIR = path.join(ROOT_DIR, 'releases');

// 1. Read current version
let version = '2.0.1';
let appName = 'internal-api-client';

if (fs.existsSync(VERSION_JSON_PATH)) {
  try {
    const vData = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
    if (vData.version) version = vData.version.replace(/^v/, '');
    if (vData.name) appName = vData.name;
  } catch (err) {}
}

const versionTag = `v${version}`;
const targetDir = path.join(RELEASES_DIR, versionTag);

// Ensure releases and version-specific directory exists
fs.mkdirSync(targetDir, { recursive: true });

console.log('====================================================');
console.log(`📦 ARCHIVING BUILD TO VERSION REPOSITORY: ${versionTag}`);
console.log('====================================================');

// 2. Find built executables in build/bin
if (fs.existsSync(BUILD_BIN_DIR)) {
  const files = fs.readdirSync(BUILD_BIN_DIR);
  for (const file of files) {
    if (file.endsWith('.exe')) {
      const src = path.join(BUILD_BIN_DIR, file);
      const dest = path.join(targetDir, file);
      fs.copyFileSync(src, dest);
      console.log(`✅ Archived: releases/${versionTag}/${file}`);
    }
  }
}

// 3. Copy updater if exists
if (fs.existsSync(UPDATER_BIN_PATH)) {
  const updaterDest = path.join(targetDir, 'updater.exe');
  fs.copyFileSync(UPDATER_BIN_PATH, updaterDest);
  console.log(`✅ Archived: releases/${versionTag}/updater.exe`);
}

// 4. Save build metadata
const metaPath = path.join(targetDir, 'metadata.json');
const meta = {
  appName,
  version: versionTag,
  archivedAt: new Date().toISOString(),
  files: fs.readdirSync(targetDir)
};
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');

console.log(`📂 Version archive preserved at: releases/${versionTag}/`);
console.log('====================================================');
