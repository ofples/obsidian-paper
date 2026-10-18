# Build from source

You do not need Node.js or Python to install a published ZIP. Release assets are packaged for Obsidian. Use this page only if you want to rebuild components and prepare release archives from a source checkout.

Install Node.js 22 or newer, open a terminal in the repository root, then run:

```sh
npm ci --ignore-scripts
npm run build
npm run test
npm run check
```

The build writes component folders under `dist/`; it does not install or enable anything in Obsidian. After the build and checks pass, maintainers can create release archives with Python 3.10 or newer using only its standard library:

```sh
python scripts/package-release.py
```

Commit the reviewed source and documentation before packaging so the manifest identifies a clean source commit. The command writes the ZIPs, `SHA256SUMS.txt` and a per-file `release-manifest.json` under `artifacts/v0.5.12/`. Downloading users do not need Python or Node.js.

Reader is an optional pinned artifact. Updating Reader belongs in the [canonical Supernote fork](https://github.com/ofples/obsidian-md-reader); the Paper build copies the reviewed snapshot recorded in `bundle-lock.json` and does not download or patch it.
