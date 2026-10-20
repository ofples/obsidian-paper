# Build from source

You do not need Node.js or Python to install a published ZIP. Release assets are packaged for Obsidian. Use this page only if you want to rebuild, test, or prepare release archives from a source checkout.

Install Node.js 22 or newer and Python 3.10 or newer, open a terminal in the repository root, then run:

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

The default command preserves the full four-archive package, including Reader and the optional combined bundle. To prepare the current UI-only prerelease with Paper 0.5.11 and Sidebar 0.4.4 only, run:

```sh
python scripts/package-release.py --ui-only
```

This writes the Paper and Sidebar ZIPs, `SHA256SUMS.txt`, and `release-manifest.json` under `artifacts/v0.5.14-ui/`. Its manifest lists only Paper and Sidebar; Reader is neither validated nor packaged in this mode. Use a clean output folder: the packager refuses to leave older Reader or combined archives beside these UI-only assets. Commit the reviewed source and documentation before packaging so the manifest identifies a clean source commit. Downloading users do not need Python or Node.js.

Reader is optional and released independently from the [canonical Supernote fork](https://github.com/ofples/obsidian-md-reader). This UI-only prerelease does not package Reader. Full default packaging continues to validate and copy the pinned Reader snapshot from `bundle-lock.json` without downloading or patching it.
