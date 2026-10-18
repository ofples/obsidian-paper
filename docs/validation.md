# Validation

## 0.5.11 / Sidebar 0.4.2 source checks

The toolbar now switches directly between editing and the saved reading mode. The focused Sidebar cases verify a single edit-to-Pages transition, the saved Scroll choice, native fallback without Reader, direct return to editing from either reading view, unchanged explicit Scroll selection, and matching labels/icons. The full Node suite has 28 passing tests.

On 2026-10-18, the coordinated device operator repaired the stylesheet after an interrupted transfer and confirmed all four installed Sidebar 0.4.2 files match the approved hashes. Physical taps changed the existing paginated note directly to editing and back to its Reader view without an intermediate scrolling view. The mode and separate Transcripts page-link controls were aligned at 48×48 px with a 4 px gap. Sidebar settings, Reader tabs and protected Transcripts state were checked for preservation. The explicit Scroll-menu path remains source-tested; its optional physical submenu inspection was not completed, and no full Transcripts settings-UI acceptance is claimed here.

Only Sidebar runtime code and its manifest changed. Paper 0.5.10, the pinned Reader 2.1.2 files, styles, licenses and fonts retain their previous bytes. Existing reading preferences are preserved; no plugin data or live vault files are written by the build.

Release packaging uses explicit component file lists and checks versions, pinned runtime hashes, ZIP member bytes and CRCs. Each archive contains its install sheet and license notices. The independent theme, Sidebar and Reader ZIPs and optional combined ZIP exclude saved settings and vault files; checksums and a per-member manifest accompany them. The manifest records the exact clean source commit used to package the release.

## Historical 0.5.10 source candidate

This candidate combines Paper 0.5.10, Sidebar 0.4.1 and the canonical Reader 2.1.2 snapshot pinned in `bundle-lock.json`. It is release preparation only: no candidate tag, public release or device installation was made.

The original Paper and Sidebar packages carry their MIT notices in source and distribution output. The build continues to retain Reader's separately pinned MIT notice and Literata's SIL Open Font License files; external GPL-3.0 Transcripts files are not included.

The project has 24 passing Node tests: eight file-reuse cases, five fullscreen-gesture cases, six optional-component/lifecycle cases and five Reader artifact integrity cases. The importer rejects changed bytes or incompatible manifests before changing output; valid copies preserve unrelated saved settings. The build verifies the canonical Reader's main, style, manifest and MIT license hashes and copies them byte-for-byte, without patches or network access.

An isolated Chromium fixture checked five component states (neither, Paper only, Sidebar only, both, and Sidebar disabled with its stylesheet still loaded), each with fullscreen off/on: all ten records passed. Checks cover native control visibility, Sidebar replacement cleanup, fullscreen scoping, Search/Open notes geometry, right-sidebar expansion, and font fallback. Screenshots were reviewed. This is synthetic HTML/CSS validation, not a full Obsidian or Supernote test. No current device acceptance is claimed.

The Reader maintainer separately reported syntax checks, 123 logic checks and 113 UI checks for exact commit `2c05d4b0a8d2ec2dcb3e7be6b553947302efdbe3`, plus the real Reader/provider isolated integration fixture. Those checks belong to the canonical fork; the package checks here verify the supplied artifact bytes and component boundaries. Last device verification of this new Reader line remains 2.1.1 in the other workspace.

## Historical 0.5.9 device validation

The 0.5.9 release was checked in an isolated Obsidian lab and on a Supernote Nomad using the separate `.obsidian-supernote` profile. The lab reported 32 passing checks and the device run reported 24 passing checks. These results cover the current 0.5.9 theme, Sidebar, and adapted Reader behavior.

The lab checks confirmed that both embedded Literata faces load, paginated Reader body text and headings use the custom family, and editing, continuous scrolling, and interface text keep their existing font families. Appearance controls were checked at narrow and wider mobile widths, including slider-thumb alignment and wrapped setting rows. The device checks covered Literata rendering, retained Reader settings and reading state, fullscreen and navigation controls, and the new layout.

Touch validation used injected WebView touch events and Android input injection. It confirms the app's handling of those events, not a person's two-finger timing, the physical digitizer, pen input, or prolonged e-ink ghosting. The two-finger double-tap gesture was not validated with a physical finger. Existing root tabs and saved reading positions were checked for preservation; Close all was inspected without closing the user's tabs.

Re-run the current checks against the exact source revision before publishing a new build. Keep raw lab/device reports, screenshots, profile backups, and device-specific state out of this repository; this page contains only a sanitized summary.
