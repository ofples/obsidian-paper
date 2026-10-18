# Pinned canonical MD Reader artifact

- Canonical fork: https://github.com/ofples/obsidian-md-reader
- Version: 2.2.0 (checked Nomad; see ../../docs/validation.md for scope and limits)
- Commit: `a7003150eda4cddc7603da7bb3576e25eebbd88c`
- Upstream: https://github.com/mrrepac/obsidian-md-reader
- Upstream base: `b23d62ce4d341ed230ff403b0f292385b41d0364` (2.1.0)
- License: MIT, copyright 2026 mrrepac; see `LICENSE`.
- Canonical `main.js` SHA-256: `dcbec2189baad7c570bfc680a60a737275e45fdca95aea98b8865754f1356668`

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
