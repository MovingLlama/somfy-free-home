const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const metaPath = path.join(__dirname, '../free-at-home-metadata.json');

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
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

const newVersion = bumpSemver(pkg.version, bumpType);

pkg.version = newVersion;
meta.version = newVersion;

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');

console.log(`Version bumped from ${pkg.version} to ${newVersion} in package.json and free-at-home-metadata.json`);
