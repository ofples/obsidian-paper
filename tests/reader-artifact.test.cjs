'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readReaderSnapshot, copyReaderSnapshot } = require('../scripts/reader-artifact.cjs');

const FILE_NAMES = ['main.js', 'styles.css', 'manifest.json', 'LICENSE'];
const PIN_ID = 'md-reader';
const PIN_VERSION = '2.1.2';
const TEMP_PREFIX = 'obsidian-paper-reader-artifact-';

function makeTempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), TEMP_PREFIX));
  const realRoot = fs.realpathSync(root);
  const realTemp = fs.realpathSync(os.tmpdir());
  assert.equal(path.dirname(realRoot), realTemp, 'test root must be a direct child of the OS temp directory');
  assert.ok(path.basename(realRoot).startsWith(TEMP_PREFIX), 'test root must have its private prefix');
  t.after(() => {
    if (!fs.existsSync(realRoot)) return;
    const info = fs.lstatSync(realRoot);
    if (info.isDirectory() && !info.isSymbolicLink() && path.dirname(fs.realpathSync(realRoot)) === realTemp) {
      fs.rmSync(realRoot, { recursive: true, force: true });
    }
  });
  return realRoot;
}

function makeFiles(overrides = {}) {
  return {
    'main.js': Buffer.from([0, 1, 2, 0xfe, 0xff]),
    'styles.css': Buffer.from('/* reader */\n', 'utf8'),
    'manifest.json': Buffer.from(JSON.stringify({ id: PIN_ID, version: PIN_VERSION }), 'utf8'),
    LICENSE: Buffer.from('Reader license\n', 'utf8'),
    ...overrides,
  };
}

function makePin(files, overrides = {}) {
  const hashes = {};
  for (const name of FILE_NAMES) {
    hashes[name] = crypto.createHash('sha256').update(files[name]).digest('hex');
  }
  return { id: PIN_ID, version: PIN_VERSION, files: hashes, ...overrides };
}

function writeFiles(directory, files) {
  fs.mkdirSync(directory, { recursive: true });
  for (const name of FILE_NAMES) fs.writeFileSync(path.join(directory, name), files[name]);
}

test('tampered source fails before modifying an existing output directory', t => {
  const root = makeTempRoot(t);
  const source = path.join(root, 'source');
  const output = path.join(root, 'output');
  const files = makeFiles();
  const pin = makePin(files);
  writeFiles(source, files);
  fs.mkdirSync(output);
  const oldMain = Buffer.from('previous main');
  const oldData = Buffer.from('{"readingState":"keep"}', 'utf8');
  fs.writeFileSync(path.join(output, 'main.js'), oldMain);
  fs.writeFileSync(path.join(output, 'data.json'), oldData);
  fs.writeFileSync(path.join(source, 'main.js'), Buffer.from('tampered'));

  assert.throws(() => copyReaderSnapshot(source, output, pin), /hash mismatch: main\.js/);
  assert.deepEqual(fs.readFileSync(path.join(output, 'main.js')), oldMain);
  assert.deepEqual(fs.readFileSync(path.join(output, 'data.json')), oldData);
  for (const name of ['styles.css', 'manifest.json', 'LICENSE']) {
    assert.equal(fs.existsSync(path.join(output, name)), false, `${name} must not be written after validation fails`);
  }
});

test('manifest id and version must match the pin even when the manifest hash matches', t => {
  const root = makeTempRoot(t);
  for (const [field, wrongValue, expectedError] of [
    ['id', 'other-reader', /manifest id/],
    ['version', '9.9.9', /manifest version/],
  ]) {
    const source = path.join(root, field);
    const manifest = { id: PIN_ID, version: PIN_VERSION, [field]: wrongValue };
    const files = makeFiles({ 'manifest.json': Buffer.from(JSON.stringify(manifest), 'utf8') });
    writeFiles(source, files);
    const pin = makePin(files);
    assert.throws(() => readReaderSnapshot(source, pin), expectedError);
  }
});

test('rejects missing files, missing hashes, and path traversal filenames', t => {
  const root = makeTempRoot(t);
  const source = path.join(root, 'source');
  const files = makeFiles();
  const pin = makePin(files);
  writeFiles(source, files);

  fs.rmSync(path.join(source, 'LICENSE'));
  assert.throws(() => readReaderSnapshot(source, pin), error => error.code === 'ENOENT');
  fs.writeFileSync(path.join(source, 'LICENSE'), files.LICENSE);

  const missingHash = structuredClone(pin);
  delete missingHash.files['styles.css'];
  assert.throws(() => readReaderSnapshot(source, missingHash), /exactly: main\.js, styles\.css, manifest\.json, LICENSE/);

  const traversal = structuredClone(pin);
  traversal.files['../outside'] = pin.files['main.js'];
  assert.throws(() => readReaderSnapshot(source, traversal), /exactly: main\.js, styles\.css, manifest\.json, LICENSE/);
});

test('copies the exact binary snapshot and preserves unrelated data.json', t => {
  const root = makeTempRoot(t);
  const source = path.join(root, 'source');
  const output = path.join(root, 'output');
  const files = makeFiles();
  const pin = makePin(files);
  const existingData = Buffer.from('{"libraryState":"keep exactly"}', 'utf8');
  writeFiles(source, files);
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(output, 'data.json'), existingData);

  const snapshot = copyReaderSnapshot(source, output, pin);
  assert.equal(snapshot.id, PIN_ID);
  assert.equal(snapshot.version, PIN_VERSION);
  for (const name of FILE_NAMES) {
    assert.deepEqual(snapshot.files[name], files[name]);
    assert.deepEqual(fs.readFileSync(path.join(output, name)), files[name]);
  }
  assert.deepEqual(fs.readFileSync(path.join(output, 'data.json')), existingData);
  assert.deepEqual(fs.readdirSync(output).sort(), [...FILE_NAMES, 'data.json'].sort());
});

test('source must be a directory', t => {
  const root = makeTempRoot(t);
  const files = makeFiles();
  const pin = makePin(files);
  const sourceFile = path.join(root, 'source-file');
  fs.writeFileSync(sourceFile, 'not a directory');
  assert.throws(() => readReaderSnapshot(sourceFile, pin), /not a directory/);
});
