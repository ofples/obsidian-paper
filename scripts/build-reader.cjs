'use strict';

// Consume the reviewed canonical artifact verbatim. Reader changes belong in
// its own repository; this build has no source patching or network access.
const fs = require('node:fs');
const path = require('node:path');
const { copyReaderSnapshot } = require('./reader-artifact.cjs');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'bundle-lock.json'), 'utf8'));
if (lock.schemaVersion !== 1) throw Error('Unsupported bundle lock version');
const pin = lock.components.reader;
const output = path.join(root, 'dist', 'plugins', 'md-reader');
copyReaderSnapshot(path.join(root, 'vendor', 'md-reader'), output, pin);
fs.copyFileSync(path.join(root, 'src', 'reader', 'defaults.json'), path.join(output, 'Supernote defaults.json'));
console.log(`Copied verified canonical MD Reader ${pin.version}; no downstream patches.`);
