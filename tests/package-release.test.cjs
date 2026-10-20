const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('UI-only release packaging emits just the two UI archives and UI-only provenance', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'obsidian-paper-ui-release-'));
  try {
    const result = spawnSync(
      process.env.PYTHON || 'python',
      [
        path.join(root, 'scripts', 'package-release.py'),
        '--ui-only',
        '--allow-dirty',
        '--output',
        output,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const expectedFiles = [
      'SHA256SUMS.txt',
      'release-manifest.json',
      'supernote-paper-0.5.11.zip',
      'supernote-sidebar-0.4.4.zip',
    ];
    assert.deepEqual(fs.readdirSync(output).sort(), expectedFiles);

    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'release-manifest.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.components).sort(), ['paper', 'sidebar']);
    assert.deepEqual(
      manifest.archives.map((archive) => archive.archive).sort(),
      ['supernote-paper-0.5.11.zip', 'supernote-sidebar-0.4.4.zip'],
    );
    assert.equal(manifest.components.paper.version, '0.5.11');
    assert.equal(manifest.components.sidebar.version, '0.4.4');
    assert.ok(manifest.archives.every((archive) =>
      archive.members.every((member) => !member.path.toLowerCase().includes('reader'))));

    const checksumNames = fs.readFileSync(path.join(output, 'SHA256SUMS.txt'), 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((line) => line.slice(line.indexOf('  ') + 2))
      .sort();
    assert.deepEqual(checksumNames, ['release-manifest.json', ...expectedFiles.filter((file) => file.endsWith('.zip'))].sort());
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('UI-only packaging refuses stale Reader archives without changing them', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'obsidian-paper-stale-release-'));
  const stalePath = path.join(output, 'md-reader-2.2.0.zip');
  fs.writeFileSync(stalePath, 'preserve this unrelated archive');
  try {
    const result = spawnSync(
      process.env.PYTHON || 'python',
      [
        path.join(root, 'scripts', 'package-release.py'),
        '--ui-only',
        '--allow-dirty',
        '--output',
        output,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /contains archives outside this package selection/);
    assert.equal(fs.readFileSync(stalePath, 'utf8'), 'preserve this unrelated archive');
    assert.deepEqual(fs.readdirSync(output), ['md-reader-2.2.0.zip']);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});
