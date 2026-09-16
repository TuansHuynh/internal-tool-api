const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WAILS_CONFIG_PATH = path.join(ROOT_DIR, 'wails.json');
const FRONTEND_PKG_PATH = path.join(ROOT_DIR, 'frontend', 'package.json');
const ROOT_PKG_PATH = path.join(ROOT_DIR, 'package.json');
const VERSION_JSON_PATH = path.join(ROOT_DIR, 'version.json');

// 1. Determine active version & app name from version.json (Priority 1) or wails.json
let currentVersion = '2.0.1';
let appName = 'Internal Tool API';

if (fs.existsSync(VERSION_JSON_PATH)) {
  try {
    const vData = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
    if (vData.version) currentVersion = vData.version.replace(/^v/, '');
    if (vData.name) appName = vData.name;
  } catch (e) {}
} else if (fs.existsSync(WAILS_CONFIG_PATH)) {
  try {
    const wData = JSON.parse(fs.readFileSync(WAILS_CONFIG_PATH, 'utf8'));
    if (wData.name) appName = wData.name;
    if (wData.outputfilename) {
      const match = wData.outputfilename.match(/v?(\d+\.\d+\.\d+.*)$/i);
      if (match) currentVersion = match[1];
    }
  } catch (e) {}
}

const outputFileName = appName;
const buildTime = new Date().toISOString();

// 2. Update version.json
const versionMetadata = {
  name: appName,
  version: currentVersion,
  outputFileName: outputFileName,
  buildTime: buildTime
};
fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(versionMetadata, null, 2) + '\n', 'utf8');

// 3. Sync to wails.json
if (fs.existsSync(WAILS_CONFIG_PATH)) {
  const wData = JSON.parse(fs.readFileSync(WAILS_CONFIG_PATH, 'utf8'));
  wData.name = appName;
  wData.outputfilename = outputFileName;
  fs.writeFileSync(WAILS_CONFIG_PATH, JSON.stringify(wData, null, 2) + '\n', 'utf8');
}

// 4. Sync to frontend/package.json
if (fs.existsSync(FRONTEND_PKG_PATH)) {
  const fPkg = JSON.parse(fs.readFileSync(FRONTEND_PKG_PATH, 'utf8'));
  fPkg.version = currentVersion;
  fs.writeFileSync(FRONTEND_PKG_PATH, JSON.stringify(fPkg, null, 2) + '\n', 'utf8');
}

// 5. Sync to root package.json
if (fs.existsSync(ROOT_PKG_PATH)) {
  const rPkg = JSON.parse(fs.readFileSync(ROOT_PKG_PATH, 'utf8'));
  rPkg.name = appName;
  rPkg.version = currentVersion;
  fs.writeFileSync(ROOT_PKG_PATH, JSON.stringify(rPkg, null, 2) + '\n', 'utf8');
}

console.log(`[Version Sync] Synced v${currentVersion} (Binary: ${outputFileName}.exe) across wails.json, version.json & package.json`);
