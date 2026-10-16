# Architecture

## Source of truth

- `src/theme/` contains the authored Supernote Paper theme sources, including the bundled Literata font definitions.
- `src/sidebar/` contains the Supernote Sidebar plugin source.
- `vendor/md-reader/main.js` is the pinned upstream MD Reader source used as input to the local adaptation.
- `scripts/build-reader.cjs` applies the maintained Supernote Reader changes to that pinned source. The generated Reader file belongs in the distributable output; edit the adaptation script rather than hand-editing generated output.
- `scripts/` builds the packages and runs focused checks. `dist/` is generated and should match the accepted 0.5.9 release behavior.

The theme and Sidebar sources are maintained directly. The Reader adaptation keeps upstream behavior where possible and adds Supernote-specific navigation, layout, fullscreen and touch handling. It consumes multi-touch without changing font size; existing one-finger paging remains. Literata is selected only for paginated Reader Book content and loaded from the theme's bundled font data.

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

No license grant is currently selected for the original Supernote Paper theme or Supernote Sidebar source. The MD Reader adaptation keeps the upstream MIT license and attribution. Literata is distributed under the SIL Open Font License with its notices. Do not add a repository-wide license until the theme and Sidebar license is chosen.
