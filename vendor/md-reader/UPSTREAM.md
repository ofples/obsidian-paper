# Canonical MD Reader artifact provenance

- Canonical fork: https://github.com/ofples/obsidian-md-reader
- Version: 2.2.0 (local unreleased artifact; distinct from the published 2.2.0)
- Commit: `7dea84a7aa924f498122e2ad7b229cdfc9c68055` (clean canonical checkout, 2026-10-20)
- Upstream: https://github.com/mrrepac/obsidian-md-reader
- Upstream base: `b23d62ce4d341ed230ff403b0f292385b41d0364` (2.1.0)
- License: MIT, copyright 2026 mrrepac; see `LICENSE`.
- `main.js` SHA-256: `739db651cb11628053b500e598e354f35c0952a3d48af10d9b02aceef0b29d35`
- `styles.css` SHA-256: `df4afc7b7699ca102643e8328885c598723ceec479eb43b9e4f6d107615dc1de`
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
as the published artifact. This snapshot's local validation and device-test
boundary are recorded in ../../docs/validation.md. The canonical
`INTEGRATION.md` remains the exact snapshot from its source commit; its older
action and review-flow descriptions do not describe the local unreleased
artifact.

This repository pins all four artifact files by these exact SHA-256 values in
`bundle-lock.json`; the offline build validates and copies them byte-for-byte
into `dist/plugins/md-reader`. No downstream patch pipeline is used.

Make Reader changes in the canonical fork. After reviewing and pinning a new
commit and its hashes, explicitly import its artifact with
`npm run reader:vendor -- --from <artifact-directory>`. The importer validates
the entire snapshot before writing any artifact bytes. It does not copy settings
or install into a vault. Preserve the MIT license when redistributing.
