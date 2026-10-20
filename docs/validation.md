# Validation

## Local 0.5.14 candidate / Paper 0.5.11 and Sidebar 0.4.4

The Paper and Sidebar update changes tab trailing borders and the native pull-down hint, plus Sidebar's top two-finger drag to Quick Switcher; those changes do not themselves alter Reader. The separately imported local unreleased Reader 2.2.0 artifact is documented below. In the coordinated device check, ADB disconnected and the operator reported Recovery before any theme or Sidebar UI candidate writes; the operator stopped without rebooting, resetting or attempting recovery. The latest Reader and Bridge remained installed and preserved. No UI candidate was installed, and native Digest capture on the local Reader revision remains pending.

### Local Reader 2.2.0 artifact (unreleased)

For the local import on 2026-10-20, the canonical fork was verified clean at frozen commit `7dea84a7aa924f498122e2ad7b229cdfc9c68055`. The manifest remains version 2.2.0, but this is a distinct local unreleased artifact, not the published 2.2.0 and has no public release URL. Only `main.js` and `styles.css` changed from the earlier artifact; `manifest.json` and the full license text are unchanged. The approved vendored license retains its CRLF bytes while the canonical Git blob uses LF; see `vendor/md-reader/UPSTREAM.md`. Exact artifact hashes are recorded there and in `bundle-lock.json`.

This artifact has an inline context menu only, with no duplicate bottom dock. Native pen/word selection and tap-selected-text fallback are supported; automatic menu opening after a long drag remains Android-dependent. Range anchoring and padding are retained. The Create Digest action uses its own selection snapshot to address a cache race; its mock regression passed. Actual native Digest capture on this exact revision remains pending user return. The local Bridge build is installed with its data preserved, but was not launched or capture-tested for this revision. The canonical maintainer reports 86 Chromium checks, 113 UI checks and passing protocol tests. These checks do not establish physical-device acceptance or successful native Digest capture. The canonical `INTEGRATION.md` remains an unmodified source snapshot and its older toolbar/review descriptions do not apply to this local artifact.

The local Node suite has 38 passing tests. An independent Chromium fixture using the actual Sidebar handlers passed 21 gesture cases: valid joint top-down drag, exactly one switcher command, generated-click suppression, fresh modal-row taps, existing palette/sidebar/fullscreen positives, pen/selection/menu/control exclusions, pinch/third-finger/cancellation rejection and Reader text-selection guards through deferred fullscreen work. Ordinary held-finger pointers remain eligible: the guards use the optional `isTextSelectionActive()` hook, not the broader held-pointer flag. These are simulated browser events, not physical finger or stylus acceptance.

Six CSS fixtures with native Obsidian CSS cover normal tabs, narrow overflow at both scroll positions, hidden trailing tabs, reordering and a wide viewport. All pass with a one-pixel trailing rule per tab, no doubled neighboring rules and the active tab's bottom open. Before/after screenshots were reviewed. The native `.pull-down-action` hint has a solid white surface, black text, a thin border and compact padding while retaining Obsidian's position/transform lifecycle.

The four Paper/Sidebar UI runtime changes remain frozen at local commit `b18bc14560d3e31cee547b6e47cd045739a8c062`. This subsequent offline import changes only Reader's script and stylesheet; all twelve files in the separate UI candidate still match their original frozen hashes. Fonts, licenses and Sidebar styles remain unchanged. Device installation and acceptance are coordinated separately. No GitHub push, tag or release is authorized for this candidate, and none was made.

## 0.5.13 / Reader 2.2.0 and Sidebar 0.4.3

Sidebar's edge-swipe and two-finger fullscreen capture handlers now exclude the complete Reader selection-actions dock using either `[data-reader-gesture-ignore]` or `.hr-reader-selection-actions`. The exclusion includes dock descendants and empty padding when the DOM selection has collapsed; it does not depend on Reader being enabled. Existing button/SVG exclusions and ordinary-content gestures remain covered.

Sidebar's local build and all 31 Node tests pass, including independent marker exclusions, button/SVG ancestry, collapsed-selection dock behavior and ordinary-content gesture controls. The 11 accepted runtime files cover the frozen Sidebar 0.4.3 and the imported canonical Reader 2.2.0. Paper 0.5.10, Sidebar's stylesheet/license, Reader's MIT license and the fonts retain their bytes. Builds do not install into a vault or read/write its saved settings.

An independent Chromium harness exercised the actual edge-gesture method and fullscreen helper with real DOM targets and a collapsed selection. All ten cases passed: attribute-only and class-only docks, buttons and nested SVG paths left touches/clicks unconsumed and did not trigger navigation. Ordinary content still opened the left drawer by an edge swipe and toggled fullscreen by a two-finger double-tap. These are synthetic browser events, separate from the coordinated physical acceptance below.

On 2026-10-18, the sole coordinated device operator verified the final Reader 2.2.0, Sidebar 0.4.3 and Bridge 0.6.0 on the Nomad. Installed Sidebar hashes match the frozen candidate, and physical selection-dock/highlight gesture compatibility passed. Live checks covered Copy with clipboard restoration; persistent Highlight/reopen/removal; first Quick Digest approval and acknowledgement; reopening the same request without insertion; trusted Quick Digest; detailed review with a typed note and non-default list; the saved-highlight dropdown; Open Digest into native Edit; and reopening the edited entry by its local receipt. Native Edit changed the Digest excerpt while leaving the Reader annotation unchanged.

All three synthetic native Digests were removed through the UI, Reader highlights and the test fixture were removed, and prior reading positions, settings and clipboard state were preserved. Source Markdown and `.note` files were unchanged. Recognition remained paused and no AI calls were made. This packaging workspace made no device calls. The canonical Reader also passed its own logic, layout, UI, reading and Digest suites; its upstream validation is separate from this package's artifact integrity checks.

These results apply to the checked Nomad/provider combination. Native Digest-to-notebook backlinks are unsupported because this integration does not write embedded `.note` references. Bridge's Open original notebook, native Cloud/Partner sync, rename handling and cross-device behavior remain unverified. Annotation Markdown can sync as vault files, but native receipt associations and Quick Digest trust stay local; no cross-device acceptance is claimed here.

## Historical 0.5.12 / Reader 2.1.3 preview at publication

This bundle imports the four canonical Reader files from release commit `30a51e694655f922850f2bc38d264d1509242b23`, using the SHA-256 values in `bundle-lock.json`. Only Reader's main script, stylesheet and manifest change among the accepted runtime files. Its MIT license, Paper 0.5.10, Sidebar 0.4.2 and both Literata font binaries retain their bytes. The build remains offline and writes no live profile or saved settings.

On 2026-10-18, the coordinated device operator confirmed Reader 2.1.3, Bridge 0.4.0 and Transcripts 0.15.0 are installed and active on the Nomad. Ordinary Markdown and managed transcript selections reached the real Bridge confirmation screen and were cancelled without saving. Native provider creation, readback and visibility were proved separately with a controlled test. The full production Reader-to-Bridge Save and acknowledgement sequence has not been live-tested; this remains a preview. Native Digest-to-notebook backlinks are unsupported because no `.note` reference is written. Bridge provides Open original notebook instead.

The operator preserved Transcripts settings/state byte-for-byte, kept recognition paused and automatic recognition off, and reported no recognition or AI calls. Reader's prior reading anchor and other settings were preserved. The known synthetic Digest and disposable probe were removed; an unidentified same-text Manual Entry was left untouched. This packaging workspace made no device changes. The canonical integration snapshot retains its release-time wording; this paragraph records the newer coordinated confirmation/Cancel evidence.

The local build and all 28 Node tests pass; syntax and integrity checks cover 18 JavaScript files and all 11 accepted runtime hashes. The release packager verifies explicit member allowlists, four Reader pins, unchanged licenses/fonts, exact archive bytes and CRCs. Final assets must come from a clean commit and carry its source identifier. Device confirmation/Cancel evidence and the separate provider proof do not substitute for production Save acceptance.

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
