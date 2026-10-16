# Pinned canonical MD Reader artifact

- Canonical fork: https://github.com/ofples/obsidian-md-reader
- Version: 2.1.2 (source candidate; not device-verified in this package)
- Commit: `2c05d4b0a8d2ec2dcb3e7be6b553947302efdbe3`
- Upstream: https://github.com/mrrepac/obsidian-md-reader
- Upstream base: `b23d62ce4d341ed230ff403b0f292385b41d0364` (2.1.0)
- License: MIT, copyright 2026 mrrepac; see `LICENSE`.
- Canonical `main.js` SHA-256: `3c59826d75cafd9b5045f248c31ed438e18beed2aff743edf685c22b6db61664`

The four artifact files (`main.js`, `styles.css`, `manifest.json`, `LICENSE`)
were imported from the clean canonical checkout at that exact commit, matching
the maintainer-supplied SHA-256 values. `bundle-lock.json` pins all four hashes.
The default build validates them and copies the bytes verbatim into
`dist/plugins/md-reader`, entirely offline. No downstream patch pipeline remains.

Make Reader changes in the canonical fork. After reviewing and pinning a new
commit and its hashes, explicitly import its artifact with
`npm run reader:vendor -- --from <artifact-directory>`. The importer validates
the entire snapshot before writing any artifact bytes. It does not copy settings
or install into a vault. Preserve the MIT license when redistributing.
