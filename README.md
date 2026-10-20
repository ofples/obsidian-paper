# Obsidian Paper

Obsidian Paper provides a high-contrast theme and an independent navigation plugin for a Supernote profile. The v0.5.14 UI prerelease contains Paper 0.5.11 and Sidebar 0.4.4 only; it does not bundle MD Reader, Transcripts, or a combined archive. MD Reader is maintained and released separately.

## Install

Open the [v0.5.14 prerelease page](https://github.com/ofples/obsidian-paper/releases/tag/v0.5.14) or the [GitHub Releases list](https://github.com/ofples/obsidian-paper/releases). If the v0.5.14 prerelease is not visible yet, wait for publication. Download the named Paper and Sidebar ZIP assets, not GitHub's automatically generated **Source code** archives; those are repository snapshots, not installable component packages.

The independent assets are `supernote-paper-0.5.11.zip` and `supernote-sidebar-0.4.4.zip`. This UI-only prerelease has no Reader or combined ZIP. The component packages are ready to install; no build tools are needed. Each ZIP has one component folder and `INSTALL.md`; `SHA256SUMS.txt` lets you check the downloads. Follow the [release installation guide](docs/release-install.md) for extraction and manual copying.

## Components

Choose only the components you want; none requires the whole package:

| Component | Works independently | Optional integration |
| --- | --- | --- |
| Supernote Paper theme | Standard Obsidian notes and settings | Styles Reader and Sidebar when present; supplies offline Literata |
| Supernote Sidebar | Native reading, navigation, Search and fullscreen with any theme | Adds Pages mode when MD Reader is enabled |
| MD Reader | Paginated Markdown reading | Obtain separately from the [canonical Reader project](https://github.com/ofples/obsidian-md-reader); it can use Paper and Sidebar when installed |

Transcripts is an optional, separately maintained plugin for recognition and page links in Supernote notebook transcripts. It works with standard Obsidian and does not require Paper, Sidebar, or Reader. Paper does not install or enable it. See the [beginner desktop and Nomad overview](docs/getting-started.md) and the [canonical Transcripts workflow guide](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md) for setup and sync order.

## Features

The v0.5.14 UI prerelease pairs Paper 0.5.11 and Sidebar 0.4.4. Literata is optional and applies only to paginated Book reading when a compatible Reader is installed; editing, continuous reading, and Obsidian's interface retain their own font settings. Sidebar adds Files and Backlinks edge gestures, same-tab read/edit controls, fullscreen options, an Open notes panel, and right-sidebar expansion. Read the [desktop and Nomad overview](docs/getting-started.md) before setting up the optional components. Reader's available versions and features are documented in its [canonical project](https://github.com/ofples/obsidian-md-reader).

- A Read/Write toolbar toggle: Read opens the saved Pages or continuous-reading preference; either reading view switches directly back to editing. Choose scrolling from Reader options or Sidebar's Reading mode setting.
- Fullscreen reading controls in the Reader menu, note menu, and command palette, plus the configurable two-finger double-tap.
- Inward edge swipes in reading views: left opens Files and right opens Backlinks. The outer 12 px are left for Android navigation; middle horizontal page swipes retain their behavior.
- Open notes lists root file tabs, including deferred files. Close all saves each root tab before detaching any; a save failure leaves the tabs open.
- Expand the right sidebar without replacing its active tab, including chat.

## Development

Node.js 22+ and Python 3.10+ are needed to run development checks and package archives; installing a published ZIP needs neither. See [building and checking locally](docs/building.md). Reader development belongs in [the canonical fork](https://github.com/ofples/obsidian-md-reader).

The original Supernote Paper theme and Supernote Sidebar are licensed under MIT; each installed component includes its own `LICENSE` file, and the repository root contains the same notice. The canonical MD Reader artifact carries its upstream MIT license, while Literata remains under the SIL Open Font License. Transcripts is an external GPL-3.0 companion and is not included or relicensed by this package. See [third-party notices](THIRD_PARTY_NOTICES.md) for the license boundaries.
