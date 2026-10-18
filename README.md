# Obsidian Paper

Obsidian Paper contains a high-contrast theme and an independent navigation plugin for a separate Supernote profile. It also carries a pinned MD Reader adaptation for optional paginated reading.

Starting from scratch? Begin with the [desktop and Nomad overview](docs/getting-started.md), then follow the [Transcripts setup and sync guide](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md). Paper, Sidebar and Reader can be added independently after your basic notebook workflow is working.

Bundle candidate 0.5.11 includes Paper 0.5.10, Sidebar 0.4.2 and Reader 2.1.2. It bundles optional Literata for paginated Book reading only. Editing, continuous scrolling, and Obsidian's interface retain their own font settings. Multi-touch pinch is consumed without changing Reader font size; the Reader's controls remain available. A two-finger double-tap from Sidebar toggles fullscreen by default in paginated and continuous reading. Turn the gesture off in Supernote Sidebar settings to restore the small mobile fullscreen exit button. The reader menu, command, and Escape remain available as fallbacks.

The companion provides Files and Backlinks edge gestures in both reading modes, same-tab reading-mode changes, an Open notes panel with save-before-close behavior, and a right-sidebar expansion control. See [architecture](docs/architecture.md) for source and build ownership and [validation](docs/validation.md) for the latest checks and their limits.

## Install

Choose only the components you want; none requires the whole package:

| Component | Works independently | Optional integration |
| --- | --- | --- |
| Supernote Paper theme | Standard Obsidian notes and settings | Styles Reader and Sidebar when present; supplies offline Literata |
| Supernote Sidebar | Native reading, navigation, Search and fullscreen with any theme | Adds Pages mode when MD Reader is enabled |
| MD Reader | Paginated Markdown reading | Uses Sidebar controls and Paper styling when available |

Transcripts is an optional, separately maintained plugin for recognition and page links in Supernote notebook transcripts. It works with standard Obsidian and does not require Paper, Sidebar, or Reader. Paper does not install or enable it. See the [beginner desktop and Nomad overview](docs/getting-started.md) and the [canonical Transcripts workflow guide](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md) for setup and sync order.

The checked-in `dist/` folders are ready for manual installation; nothing automatically downloads, installs, or enables a component. Node.js 22 or newer is needed only if you want to rebuild the packages:

```sh
npm ci --ignore-scripts
npm run build
npm run test
npm run check
```

On the Supernote, choose **Settings → Files and links → Override config folder**, enter `.obsidian-supernote`, and restart Obsidian. Keep the computer on its existing configuration folder. Copy the folders from `dist/` into this dedicated Supernote profile:

- `dist/themes/Supernote Paper` → `<vault>/.obsidian-supernote/themes/Supernote Paper`
- `dist/plugins/supernote-sidebar` → `<vault>/.obsidian-supernote/plugins/supernote-sidebar`
- `dist/plugins/md-reader` → `<vault>/.obsidian-supernote/plugins/md-reader`

Copy only the folders you selected. Select Supernote Paper in Appearance if you want the theme, and enable each desired plugin under Community plugins. MD Reader supplies paginated Book mode. Sidebar uses native continuous reading when Reader is absent; its edit/read button remains usable. Disabling Sidebar restores its native control replacements. The theme and plugins do not install themselves on a device or alter vault Sync settings. On the Supernote, turn off the **Vault configuration sync** categories while leaving note Sync available.

For a fresh MD Reader installation, you may copy `Supernote defaults.json` to `data.json` in that plugin folder before enabling it for the first time. This optional preference template selects Paper's Literata family, with a generic serif fallback if Paper is absent. You can also keep Reader's own defaults. For an existing installation, keep `data.json` and choose **Reading font → Custom** in the Reader's Appearance/MD Reader settings, then enter `"Supernote Literata", serif` as the custom family if you want Paper's font. Keep the existing font-size multiplier. These Reader font preferences apply to paginated Book content; normal scrolling and editing keep their existing fonts.

Existing MD Reader settings contain font and size choices, saved reading positions, and library state. Do not replace an existing plugin `data.json` with a fresh-install template. Use the plugin settings UI to change preferences. Existing duplicate tabs are left in place; reopening a file reuses its matching root tab, while explicit new-tab and split actions can still create another copy.

## Features

- A Read/Write toolbar toggle: Read opens the saved Pages or continuous-reading preference; either reading view switches directly back to editing. Choose scrolling from Reader options or Sidebar's Reading mode setting.
- Fullscreen reading controls in the Reader menu, note menu, and command palette, plus the configurable two-finger double-tap.
- Inward edge swipes in reading views: left opens Files and right opens Backlinks. The outer 12 px are left for Android navigation; middle horizontal page swipes retain their behavior.
- Open notes lists root file tabs, including deferred files. Close all saves each root tab before detaching any; a save failure leaves the tabs open.
- Expand the right sidebar without replacing its active tab, including chat.

## Development

Edit `src/theme` and `src/sidebar` for the theme and companion. Reader development belongs in [the canonical fork](https://github.com/ofples/obsidian-md-reader). This package pins its 2.1.2 artifact by exact commit and SHA-256 in `bundle-lock.json`, validates the vendored snapshot, then copies it without patches. Normal builds are offline. Maintainer updates are explicit: review the new artifact and lock entry, then run `npm run reader:vendor -- --from <artifact-directory>`.

Build components separately with `npm run build:theme`, `npm run build:sidebar`, or `npm run build:reader`. Run build, test and check before committing generated `dist/` changes. `npm run check` validates component versions, the Reader pin, the independent Sidebar stylesheet and the reviewed runtime hashes. CI runs on Windows and Linux with Node.js 22 and 24. Bundle 0.5.11 / Sidebar 0.4.2 / Reader 2.1.2 are source candidates; this preparation does not tag a release or install on the device.

Local session files, vaults, raw device reports, backups and application runtimes are intentionally excluded by `.gitignore`. No device connection is needed to build or run the focused tests.

The original Supernote Paper theme and Supernote Sidebar are licensed under MIT; each installed component includes its own `LICENSE` file, and the repository root contains the same notice. The canonical MD Reader artifact carries its upstream MIT license, while Literata remains under the SIL Open Font License. Transcripts is an external GPL-3.0 companion and is not included or relicensed by this package. See [third-party notices](THIRD_PARTY_NOTICES.md) for the license boundaries.
