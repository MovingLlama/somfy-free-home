const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const metaPath = path.join(__dirname, '../free-at-home-metadata.json');
const manifestPath = path.join(__dirname, '../manifest.json');

const bumpType = process.argv[2] || 'patch';

function bumpSemver(version, type) {
  let [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const newVersion = bumpSemver(pkg.version, bumpType);

pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

if (fs.existsSync(metaPath)) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.version = newVersion;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
}

if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

console.log(`Version bumped to ${newVersion} in package.json, free-at-home-metadata.json, and manifest.json`);
