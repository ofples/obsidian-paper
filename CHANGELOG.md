# Changelog

## 0.5.13 (in preparation; Sidebar 0.4.3)

- Exclude the whole Reader selection-actions dock from Sidebar's edge-swipe and two-finger fullscreen gestures, including empty padding after the selection collapses.
- Support both the optional `data-reader-gesture-ignore` marker and the selection-dock class while preserving existing button and nested-icon exclusions.
- Keep the published Reader 2.1.3 pin until the next canonical release completes its checks; this preparation does not publish or install a bundle.

## 0.5.12 (Reader 2.1.3 preview)

- Import the canonical MD Reader 2.1.3 release artifact with four verified SHA-256 pins; keep Paper 0.5.10 and Sidebar 0.4.2 unchanged.
- Offer optional Android text selection to the separately installed Supernote Bridge 0.4.0 for native Digest capture. Ordinary Markdown works independently; managed transcript selections require Transcripts 0.15 provenance and a matching local mirror.
- Keep capture confirmation and explicit Save in Bridge. Native Digest-to-notebook backlinks remain unsupported; Bridge provides Open original notebook instead.
- Publish the feature as a preview: confirmation and Cancel passed on the Nomad, while the full production Save/acknowledgement flow still needs a live test.

## 0.5.11 (Sidebar 0.4.2)

- Simplify the toolbar to Read/Write: editing opens the saved reading preference directly, and both paginated and continuous reading return to editing.
- Keep scrolling as an explicit Reader-menu or Sidebar-settings choice, with native reading fallback when Reader is absent.
- Keep Paper 0.5.10 and the canonical Reader 2.1.2 artifact unchanged.

## 0.5.10 (release preparation)

- Consume the canonical MD Reader 2.1.2 artifact with strict hashes and an offline build, removing the downstream Reader patch pipeline.
- Keep component versions separate in an optional bundle lock; no automatic installation or settings changes.
- Keep native mobile navigation and view controls available when Sidebar is disabled.
- Give Sidebar its own functional stylesheet, including fullscreen, Search and Open notes layouts.
- Fall back to standard Markdown reading when MD Reader is unavailable, and keep the reading-mode action usable.
- Restore Sidebar-owned control markers and body classes when the plugin unloads.
- License the original Paper and Sidebar components under MIT while preserving Reader MIT, Literata OFL, and external Transcripts GPL-3.0 boundaries.

## 0.5.9

- Bundle offline Literata upright/italic fonts for paginated Book mode while retaining editing, scrolling and interface fonts.
- Wait for the bundled font before initial pagination and remeasure after font loading.
- Disable pinch-to-resize text while retaining manual sizing, page gestures and two-finger fullscreen.
- Remove borders from panel close controls and Close all tabs.
- Center square slider handles and prevent wrapped Appearance rows from overlapping.

## 0.5.8

- Reuse existing root file tabs for ordinary opens while preserving deliberate new tabs and splits.
- Refine tab borders, right-side Open notes, Close all tabs, and right-sidebar expansion.
- Cycle between Edit, continuous scrolling and paginated reading in the same tab.
- Add reading fullscreen and configurable two-finger double-tap, with menu/command fallbacks.

Earlier prototypes and private device backups remain local. This repository starts from the accepted 0.5.9 source and distributable artifacts.
