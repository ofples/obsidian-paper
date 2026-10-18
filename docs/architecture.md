# Architecture

## Source of truth

- `src/theme/` contains the authored Supernote Paper theme sources, including the bundled Literata font definitions.
- `src/sidebar/` contains the Supernote Sidebar plugin source.
- `src/sidebar/styles.css` supplies Sidebar's functional layout with standard Obsidian theme colors. Sidebar does not require Paper's stylesheet.
- `vendor/md-reader/` is an immutable snapshot of the canonical Reader artifact pinned in `bundle-lock.json`.
- `scripts/build-reader.cjs` validates and copies that snapshot byte-for-byte. Reader changes belong in [the canonical fork](https://github.com/ofples/obsidian-md-reader), never a local patch script or hand-edited distribution.
- `scripts/` builds the packages and runs focused checks. `dist/` is generated and checked against the reviewed source artifact record.

The theme and Sidebar sources are maintained directly. Paper is CSS only. Sidebar owns its `sn-sidebar-active` lifecycle marker and removes the controls, markers and behavior it added when unloaded. Paper hides native controls replaced by Sidebar only while that marker is present. The mode button switches directly between editing and the saved reading preference, with no intermediate scrolling step. Either paginated Reader or native Markdown Preview switches back to editing. When Reader is unavailable, Sidebar uses native Preview while preserving a stored Pages preference. Explicit scrolling selection remains in Reader options and Sidebar settings.

Sidebar 0.4.3 treats any descendant of `[data-reader-gesture-ignore]` or `.hr-reader-selection-actions` as a control in both its edge-swipe and two-finger fullscreen handlers. This includes empty dock padding even after the browser selection collapses. The marker is optional and adds no Reader dependency; ordinary content and existing buttons retain their gesture behavior. Reader must also exclude its own dock from page gestures because a control's bubbling listener cannot undo an earlier document capture listener.

The Reader adaptation keeps upstream behavior where possible and adds Supernote-specific navigation, layout, fullscreen and touch handling. It consumes multi-touch without changing font size; existing one-finger paging remains. The optional Supernote preset or explicit Reader font setting selects Literata for paginated Book content using the theme's bundled font data. Reader's own default remains the theme font. Without Paper, the optional custom font preference falls back to the browser's serif family.

The Reader 2.1.3 snapshot comes from canonical commit `30a51e694655f922850f2bc38d264d1509242b23`. The old downstream Reader patch pipeline has been removed. The Reader retains its `md-reader` plugin ID for existing settings and positions. Upstream Reader and this fork are alternatives under that ID; install one at a time and preserve `data.json`.

## Optional integration contract

Transcripts owns recognition and the optional `nomad-transcripts.pageLinks` renderer. Reader owns pagination and may call `renderSection({element, sourcePath, markdown, sourceLineMap, component})`. The version-1 provider exposes `apiVersion: 1`, `capabilities: ['renderSection']` and `enabled()`. Legacy structurally compatible providers without an API version remain supported. Missing, disabled or unsupported providers use standard Markdown; false or an exception clears partial provider output and renders standard Markdown once. No recognition request is triggered by this build or bundle.

Paper contains scoped optional Reader styling; Sidebar supplies navigation enhancements. Reader must still function without either. See the canonical [integration contract](../vendor/md-reader/INTEGRATION.md).

Reader 2.1.3 also supports an optional Android selection handoff to the separately installed Supernote Bridge 0.4.0. Ordinary Markdown needs neither Transcripts nor Paper. Managed transcript Markdown requires Transcripts 0.15's version-1 `selectionProvenance` capability and a matching local mirror; Reader does not silently convert a failed managed selection to an ordinary Markdown source. Bridge owns confirmation and explicit Save, while Reader accepts a successful result only through a valid callback. Reopening the same pending handoff reviews its status with the same request ID; Bridge's durable ledger and write lock prevent a second provider insertion. Pending or uncertain provider writes are one-shot; only confirmed cancellation with no write permits a new reviewed Save. Neither Bridge nor Transcripts modifies `.note` files, so native Digest-to-notebook backlinks are unsupported. Bridge supplies an Open original notebook action. See [validation](validation.md) for the tested confirmation/Cancel path and the untested production Save path.

## Pinned packaging

Each component has its own manifest and version. `bundle-lock.json` records the optional component choices and pins all four external Reader files by SHA-256 and an exact source commit. Transcripts is an optional external companion, not bundled or enabled automatically here.

The default build is offline. Maintainers review a canonical Reader change, update its lock entry, and run `npm run reader:vendor -- --from <artifact-directory>` explicitly. The importer validates every file and manifest before writing. Builds and importers write project artifacts only; they never select a vault, copy `data.json`, enable a plugin, or change configuration sync.

Release ZIPs are created separately with `python scripts/package-release.py` from a clean reviewed commit. The packager uses explicit component file lists, validates versions and hashes, preserves license notices, and checks the complete ZIP contents after writing. It emits three independent component ZIPs and an optional combined bundle, plus archive checksums and a per-member manifest. Source snapshots from GitHub are not the installable assets. See [installation](release-install.md) and [source builds](building.md).

## Distribution layout

The build produces installable Obsidian folders under `dist/`:

```text
dist/
  themes/Supernote Paper/
  plugins/supernote-sidebar/
  plugins/md-reader/
```

Copy those folders into the dedicated vault configuration directory, such as `.obsidian-supernote`. Do not copy a saved plugin `data.json` from a fresh-install template over an existing profile: that file includes user settings and reading state.

## Licensing

The original Supernote Paper theme and Supernote Sidebar source are licensed under MIT, with matching notices at the repository root and in each component's source and installable folder. The canonical MD Reader artifact keeps its upstream MIT license and attribution. Literata remains under the SIL Open Font License with its original notices. The external Transcripts companion remains GPL-3.0, is not bundled, and is not relicensed by this repository.
