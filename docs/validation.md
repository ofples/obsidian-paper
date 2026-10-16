# Validation

The 0.5.9 release was checked in an isolated Obsidian lab and on a Supernote Nomad using the separate `.obsidian-supernote` profile. The lab reported 32 passing checks and the device run reported 24 passing checks. These results cover the current 0.5.9 theme, Sidebar, and adapted Reader behavior.

The lab checks confirmed that both embedded Literata faces load, paginated Reader body text and headings use the custom family, and editing, continuous scrolling, and interface text keep their existing font families. Appearance controls were checked at narrow and wider mobile widths, including slider-thumb alignment and wrapped setting rows. The device checks covered Literata rendering, retained Reader settings and reading state, fullscreen and navigation controls, and the new layout.

Touch validation used injected WebView touch events and Android input injection. It confirms the app's handling of those events, not a person's two-finger timing, the physical digitizer, pen input, or prolonged e-ink ghosting. The two-finger double-tap gesture was not validated with a physical finger. Existing root tabs and saved reading positions were checked for preservation; Close all was inspected without closing the user's tabs.

Re-run the current checks against the exact source revision before publishing a new build. Keep raw lab/device reports, screenshots, profile backups, and device-specific state out of this repository; this page contains only a sanitized summary.
