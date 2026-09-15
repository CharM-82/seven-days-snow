const fs = require('fs');
const path = require('path');
const src = __dirname + '/..';
const dst = path.join(src, 'github-sync');
const d = require('../js/data.js');
const files = ['index.html', 'style.css', 'version.json'];
const js = ['js/rng.js', 'js/data.js', 'js/engine.js', 'js/ui.js', 'js/main.js'];
function copy(f) {
  const from = path.join(src, f);
  const to = path.join(dst, f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('copy', f);
}
if (process.argv.includes('--dry-run')) {
  console.log('dry-run only, no writes');
} else {
  files.forEach(copy);
  js.forEach(copy);
  const version = { appVersion: d.APP_VERSION, saveSchemaVersion: d.SAVE_SCHEMA_VERSION, builtAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dst, 'version.json'), JSON.stringify(version, null, 2), 'utf8');
  console.log('version.json written to publish dir');
}
console.log('done');
