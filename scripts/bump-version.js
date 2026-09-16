const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const WAILS_CONFIG_PATH = path.join(ROOT_DIR, 'wails.json');
const FRONTEND_PKG_PATH = path.join(ROOT_DIR, 'frontend', 'package.json');
const ROOT_PKG_PATH = path.join(ROOT_DIR, 'package.json');
const VERSION_JSON_PATH = path.join(ROOT_DIR, 'version.json');
const LATEST_JSON_PATH = path.join(ROOT_DIR, 'latest.json');

// GitHub repository for release download URLs
const GITHUB_REPO = 'TuansHuynh/internal-tool-api';

// Parse CLI arguments
const rawArgs = process.argv.slice(2);
let bumpType = 'patch'; // 'patch', 'minor', 'major', or specific version 'X.Y.Z'
let customName = null;
let doBuild = false;

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--build' || arg === '-b') {
    doBuild = true;
  } else if (arg.startsWith('--name=')) {
    customName = arg.split('=')[1].trim();
  } else if (arg === '--name' || arg === '-n') {
    customName = rawArgs[++i];
  } else if (!arg.startsWith('-')) {
    bumpType = arg.trim();
  }
}

// 1. Read current version: Priority 1: version.json, Priority 2: wails.json, Priority 3: package.json
let currentVersion = '2.0.1';
let currentAppName = 'Internal Tool API';

if (fs.existsSync(VERSION_JSON_PATH)) {
  try {
    const vData = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
    if (vData.version) currentVersion = vData.version.replace(/^v/, '');
    if (vData.name) currentAppName = vData.name;
  } catch (err) {}
} else if (fs.existsSync(WAILS_CONFIG_PATH)) {
  try {
    const wailsData = JSON.parse(fs.readFileSync(WAILS_CONFIG_PATH, 'utf8'));
    if (wailsData.name) currentAppName = wailsData.name;
    if (wailsData.outputfilename) {
      const match = wailsData.outputfilename.match(/v?(\d+\.\d+\.\d+.*)$/i);
      if (match) currentVersion = match[1];
    }
  } catch (err) {}
} else if (fs.existsSync(FRONTEND_PKG_PATH)) {
  const pkg = JSON.parse(fs.readFileSync(FRONTEND_PKG_PATH, 'utf8'));
  if (pkg.version) currentVersion = pkg.version;
}

// 2. Compute new version
function bumpSemver(versionStr, type) {
  const clean = versionStr.replace(/^v/, '');
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);

  let [major, minor, patch] = parts;

  switch (type.toLowerCase()) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      return `${major}.${minor}.${patch}`;
    case 'minor':
      minor += 1;
      patch = 0;
      return `${major}.${minor}.${patch}`;
    case 'patch':
      patch += 1;
      return `${major}.${minor}.${patch}`;
    case 'sync':
      return `${major}.${minor}.${patch}`;
    default:
      // Custom version string (e.g. 2.0.0-rc1)
      return type.replace(/^v/, '');
  }
}

const newVersion = bumpSemver(currentVersion, bumpType);
const newAppName = customName || 'Internal Tool API';
const newOutputFileName = newAppName;

console.log('====================================================');
console.log(`🚀 BUMP VERSION & APP NAME AUTOMATION TOOL`);
console.log('====================================================');
console.log(`📦 Current App Name : ${currentAppName}`);
console.log(`📌 Current Version  : v${currentVersion}`);
console.log(`✨ Target Version   : v${newVersion} (${bumpType})`);
console.log(`🏷️ Target App Name  : ${newAppName}`);
console.log(`🎯 Output Executable: ${newOutputFileName}.exe`);
console.log('----------------------------------------------------');

// 3. Write version.json (master config)
const versionMetadata = {
  name: newAppName,
  version: newVersion,
  outputFileName: newOutputFileName,
  buildTime: new Date().toISOString()
};
fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(versionMetadata, null, 2) + '\n', 'utf8');
console.log('✅ Updated version.json');

// 4. Update wails.json
if (fs.existsSync(WAILS_CONFIG_PATH)) {
  const wailsData = JSON.parse(fs.readFileSync(WAILS_CONFIG_PATH, 'utf8'));
  wailsData.name = newAppName;
  wailsData.outputfilename = newOutputFileName;
  fs.writeFileSync(WAILS_CONFIG_PATH, JSON.stringify(wailsData, null, 2) + '\n', 'utf8');
  console.log('✅ Updated wails.json');
}

// 5. Update frontend/package.json
if (fs.existsSync(FRONTEND_PKG_PATH)) {
  const pkg = JSON.parse(fs.readFileSync(FRONTEND_PKG_PATH, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(FRONTEND_PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('✅ Updated frontend/package.json');
}

// 6. Update root package.json
if (fs.existsSync(ROOT_PKG_PATH)) {
  const pkg = JSON.parse(fs.readFileSync(ROOT_PKG_PATH, 'utf8'));
  pkg.name = newAppName;
  pkg.version = newVersion;
  fs.writeFileSync(ROOT_PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('✅ Updated package.json');
}

// 7. Update latest.json (manifest template — SHA256 placeholders are filled by CI)
const baseUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${newVersion}`;
const latestManifest = {
  version: newVersion,
  platforms: {
    'windows-amd64': {
      url: `${baseUrl}/${newAppName}-v${newVersion}.exe`,
      sha256: 'PLACEHOLDER_WINDOWS_SHA256'
    },
    'linux-amd64': {
      url: `${baseUrl}/${newAppName}-v${newVersion}`,
      sha256: 'PLACEHOLDER_LINUX_SHA256'
    },
    'darwin-amd64': {
      url: `${baseUrl}/${newAppName}-v${newVersion}-darwin-amd64`,
      sha256: 'PLACEHOLDER_DARWIN_AMD64_SHA256'
    },
    'darwin-arm64': {
      url: `${baseUrl}/${newAppName}-v${newVersion}-darwin-arm64`,
      sha256: 'PLACEHOLDER_DARWIN_ARM64_SHA256'
    }
  }
};
fs.writeFileSync(LATEST_JSON_PATH, JSON.stringify(latestManifest, null, 2) + '\n', 'utf8');
console.log('✅ Updated latest.json (SHA256 placeholders — CI will fill real values)');

// 8. Optional Build
if (doBuild) {
  console.log('\n🔨 Building updater binary first...');
  try {
    execSync('go build -ldflags="-s -w" -o internal/updater/bin/updater.exe ./cmd/updater/', { stdio: 'inherit', cwd: ROOT_DIR });
    console.log('✅ updater.exe built');
  } catch (err) {
    console.error('❌ updater build failed:', err.message);
    process.exit(1);
  }

  console.log('\n🔨 Building application binary with new version...');
  try {
    execSync('wails build', { stdio: 'inherit', cwd: ROOT_DIR });
    console.log(`\n🎉 Build completed successfully: build/bin/${newOutputFileName}.exe`);
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

console.log('====================================================');
console.log(`🎉 Successfully upgraded to v${newVersion}!`);
console.log('====================================================\n');
