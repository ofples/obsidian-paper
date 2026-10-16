# Obsidian Paper

Supernote Paper is a high-contrast Obsidian theme and companion navigation plugin for a separate Supernote profile. The release includes the local MD Reader adaptation used for paginated reading.

Version 0.5.9 bundles Literata for paginated Book reading only. Editing, continuous scrolling, and Obsidian's interface retain their own font settings. Multi-touch pinch is consumed without changing Reader font size; the Reader's controls remain available. A two-finger double-tap toggles fullscreen by default in paginated and continuous reading. Turn the gesture off in Supernote Sidebar settings to restore the small mobile fullscreen exit button. The reader menu, command, and Escape remain available as fallbacks.

The companion provides Files and Backlinks edge gestures in both reading modes, same-tab reading-mode changes, an Open notes panel with save-before-close behavior, and a right-sidebar expansion control. See [architecture](docs/architecture.md) for source and build ownership and [validation](docs/validation.md) for the latest checks and their limits.

## Install

The checked-in `dist/` folders are ready to install. To rebuild them, use Node.js 22 or newer:

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

Select Supernote Paper in Appearance, then enable Supernote Sidebar and MD Reader under Community plugins. MD Reader supplies paginated Book mode. The theme and plugins do not install themselves on a device or alter vault Sync settings. On the Supernote, turn off the **Vault configuration sync** categories while leaving note Sync available.

For a fresh MD Reader installation, copy `Supernote defaults.json` to `data.json` in that plugin folder before enabling it for the first time. For an existing installation, keep `data.json` and choose **Reading font → Custom** in the Reader's Appearance/MD Reader settings, then enter `"Supernote Literata", serif` as the custom family. Keep the existing font-size multiplier. These Reader font preferences apply to paginated Book content; normal scrolling and editing keep their existing fonts.

Existing MD Reader settings contain font and size choices, saved reading positions, and library state. Do not replace an existing plugin `data.json` with a fresh-install template. Use the plugin settings UI to change preferences. Existing duplicate tabs are left in place; reopening a file reuses its matching root tab, while explicit new-tab and split actions can still create another copy.

## Features

- Edit → continuous scrolling → paginated Pages mode cycling, with direct scrolling access in the Reader menu.
- Fullscreen reading controls in the Reader menu, note menu, and command palette, plus the configurable two-finger double-tap.
- Inward edge swipes in reading views: left opens Files and right opens Backlinks. The outer 12 px are left for Android navigation; middle horizontal page swipes retain their behavior.
- Open notes lists root file tabs, including deferred files. Close all saves each root tab before detaching any; a save failure leaves the tabs open.
- Expand the right sidebar without replacing its active tab, including chat.

## Development

Edit `src/theme` and `src/sidebar` for the theme and companion. Keep Reader adaptations in `scripts/build-reader.cjs`, with the pinned upstream input under `vendor/md-reader`. Run build, test and check before committing generated `dist/` changes. `npm run check` also compares the generated runtime files with the accepted release hashes; update that record after reviewing and validating a new release. CI runs on Windows and Linux with Node.js 22 and 24.

Local session files, vaults, raw device reports, backups and application runtimes are intentionally excluded by `.gitignore`. No device connection is needed to build or run the focused tests.

The original Supernote Paper theme and Sidebar source do not yet include a project license grant. The MD Reader adaptation retains its upstream MIT license; bundled Literata fonts retain their SIL Open Font License. See [third-party notices](THIRD_PARTY_NOTICES.md) and the distribution folders for their licenses.
