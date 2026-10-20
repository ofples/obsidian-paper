# Canonical MD Reader artifact provenance

- Canonical fork: https://github.com/ofples/obsidian-md-reader
- Version: 2.2.0 (local unreleased artifact; distinct from the published 2.2.0)
- Commit: `25fd0d2b96eb7987b9f8db5a447ce9bf61f1c481` (clean canonical checkout, 2026-10-20)
- Upstream: https://github.com/mrrepac/obsidian-md-reader
- Upstream base: `b23d62ce4d341ed230ff403b0f292385b41d0364` (2.1.0)
- License: MIT, copyright 2026 mrrepac; see `LICENSE`.
- `main.js` SHA-256: `4ff774189ec9fa5dc0fef83dd92b6d70eec40e9ac7bcbe435748a3eeed7a04b9`
- `styles.css` SHA-256: `ad52d2cee25b6a9652057f4a9738d4d03ed8f0cf0fa3984747ca276c3bc46490`
- `manifest.json` SHA-256: `6af121e711565a4a22d99b920ff889d5e51f09c3634996575fc074a8fdda4ec4`
- `LICENSE` SHA-256: `53394eab0504fdd2fa705f80ec7a3b8e2dc10bb3df9065a889880275360af2d1`

The `main.js`, `styles.css` and `manifest.json` match the clean canonical
checkout at that exact commit. The license text also matches, but the approved
vendored `LICENSE` retains its original CRLF bytes and SHA-256 above; the
canonical Git blob uses LF and hashes to
`b67271e33387728abbce117cb77ae2c8ee5c685fed29d8deb28a68be851c95c3`. The
manifest and license text are unchanged from the published 2.2.0 snapshot; the
main script and stylesheet are local unreleased changes. There is no public
release URL for this commit, and the version number alone does not identify it
as the published artifact. The canonical `INTEGRATION.md` for this commit
documents the inline Highlight/Copy/Quick Digest/Create Digest menu, the
different Quick Digest and Create Digest handoffs, and signed exact-category
delivery with optional Transcripts source defaults. This snapshot's local
validation and device-test boundary are recorded in ../../docs/validation.md.

This repository pins all four artifact files by these exact SHA-256 values in
`bundle-lock.json`; the offline build validates and copies them byte-for-byte
into `dist/plugins/md-reader`. No downstream patch pipeline is used.

Make Reader changes in the canonical fork. After reviewing and pinning a new
commit and its hashes, explicitly import its artifact with
`npm run reader:vendor -- --from <artifact-directory>`. The importer validates
the entire snapshot before writing any artifact bytes. It does not copy settings
or install into a vault. Preserve the MIT license when redistributing.
