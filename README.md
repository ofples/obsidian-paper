# Obsidian Paper

Obsidian Paper contains a high-contrast theme and an independent navigation plugin for a separate Supernote profile. It also carries a pinned MD Reader adaptation for optional paginated reading.

## Install

Open the [v0.5.13 prerelease page](https://github.com/ofples/obsidian-paper/releases/tag/v0.5.13) or the [GitHub Releases list](https://github.com/ofples/obsidian-paper/releases). If the v0.5.13 prerelease is not visible yet, wait for publication. Download the named ZIP assets, not GitHub's automatically generated **Source code** archives; those are repository snapshots, not installable component packages.

The independent assets are `supernote-paper-0.5.10.zip`, `supernote-sidebar-0.4.3.zip`, and `md-reader-2.2.0.zip`. The optional combined asset is `obsidian-paper-0.5.13.zip`. These are ready-to-install packages; no build tools are needed. Each ZIP has a single top-level folder and `INSTALL.md`; the release includes `SHA256SUMS.txt` for checking downloads. Follow the [release installation guide](docs/release-install.md) for extraction and manual copying.

## Components

Choose only the components you want; none requires the whole package:

| Component | Works independently | Optional integration |
| --- | --- | --- |
| Supernote Paper theme | Standard Obsidian notes and settings | Styles Reader and Sidebar when present; supplies offline Literata |
| Supernote Sidebar | Native reading, navigation, Search and fullscreen with any theme | Adds Pages mode when MD Reader is enabled |
| MD Reader | Paginated Markdown reading | Uses Sidebar controls and Paper styling when available |

Transcripts is an optional, separately maintained plugin for recognition and page links in Supernote notebook transcripts. It works with standard Obsidian and does not require Paper, Sidebar, or Reader. Paper does not install or enable it. See the [beginner desktop and Nomad overview](docs/getting-started.md) and the [canonical Transcripts workflow guide](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md) for setup and sync order.

## Features

The v0.5.13 bundle pairs Paper 0.5.10, Sidebar 0.4.3, and Reader 2.2.0. Literata is optional and applies only to paginated Book reading; editing, continuous reading, and Obsidian's interface retain their own font settings. Multi-touch pinch does not change Reader font size. Sidebar adds Files and Backlinks edge gestures, same-tab read/edit controls, fullscreen options, an Open notes panel, and right-sidebar expansion. Read the [desktop and Nomad overview](docs/getting-started.md) before setting up the optional components.

On Android, Reader adds **Digest**, **Digest with note…**, **Highlight**, and **Copy** selection actions; Digest handoff requires the separate Supernote Bridge 0.6.0 app. Reader highlights are separate Markdown files in `Reader Highlights` and sync with the vault without changing source notes or `.note` notebooks. Transcripts 0.15 is optional for ordinary Markdown; managed transcript excerpts require its selection provenance and a matching local mirror. See the [Reader Digest guide](https://github.com/ofples/obsidian-md-reader/blob/v2.2.0/docs/native-digests.md) for behavior and limits.

- A Read/Write toolbar toggle: Read opens the saved Pages or continuous-reading preference; either reading view switches directly back to editing. Choose scrolling from Reader options or Sidebar's Reading mode setting.
- Fullscreen reading controls in the Reader menu, note menu, and command palette, plus the configurable two-finger double-tap.
- Inward edge swipes in reading views: left opens Files and right opens Backlinks. The outer 12 px are left for Android navigation; middle horizontal page swipes retain their behavior.
- Open notes lists root file tabs, including deferred files. Close all saves each root tab before detaching any; a save failure leaves the tabs open.
- Expand the right sidebar without replacing its active tab, including chat.

## Development

Node.js is only needed to rebuild packages from source. See [building and checking locally](docs/building.md). Reader development belongs in [the canonical fork](https://github.com/ofples/obsidian-md-reader).

The original Supernote Paper theme and Supernote Sidebar are licensed under MIT; each installed component includes its own `LICENSE` file, and the repository root contains the same notice. The canonical MD Reader artifact carries its upstream MIT license, while Literata remains under the SIL Open Font License. Transcripts is an external GPL-3.0 companion and is not included or relicensed by this package. See [third-party notices](THIRD_PARTY_NOTICES.md) for the license boundaries.
