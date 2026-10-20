# Install Obsidian Paper components

This guide covers the UI-only v0.5.14 prerelease. It has separate Paper and Sidebar component ZIPs; it does not include MD Reader or a combined ZIP. Open the [v0.5.14 prerelease page](https://github.com/ofples/obsidian-paper/releases/tag/v0.5.14) or the [GitHub Releases list](https://github.com/ofples/obsidian-paper/releases). If the v0.5.14 prerelease is not visible yet, wait for publication.

Download the named ZIP asset for each component you want. Do not use GitHub's automatically generated **Source code** ZIP or TAR archives; they are source snapshots, not installable packages. `SHA256SUMS.txt` is published alongside the component ZIPs so you can compare the downloaded files before extracting them.

On Windows, calculate a downloaded ZIP's hash in PowerShell with `Get-FileHash .\supernote-paper-0.5.11.zip -Algorithm SHA256` (replace the filename for another asset), then compare its `Hash` value with the matching line in `SHA256SUMS.txt`.

| Release asset | Folder at the top of the extracted ZIP | Install destination under the active Obsidian configuration |
| --- | --- | --- |
| `supernote-paper-0.5.11.zip` | `Supernote Paper/` | `themes/Supernote Paper/` |
| `supernote-sidebar-0.4.4.zip` | `supernote-sidebar/` | `plugins/supernote-sidebar/` |

## Install on desktop or Nomad

1. Choose the active Obsidian configuration folder. On desktop, keep using your existing profile; you can leave its current theme in place. On Nomad, select a separate folder such as `.obsidian-supernote` in **Settings → Files and links → Override config folder**, then restart Obsidian. Do not copy your desktop's Obsidian settings into the Nomad profile.
2. Close Obsidian on the device where you will install or update the component.
3. Extract the ZIP, then copy the component folder from the table into the matching `themes/` or `plugins/` folder inside the active configuration folder. The `themes` and `plugins` folders may need to be created.
4. To update a component, copy its package files into the existing component folder. Do not delete or replace the whole folder; preserve existing `data.json`, state files, settings, and reading positions.
5. Reopen Obsidian. If you installed Paper, select **Supernote Paper** under Appearance. If you installed Sidebar, enable it manually under Community plugins. Nothing in the ZIPs automatically enables plugins or copies settings.

For the Nomad profile, disable Obsidian Sync's **Vault configuration** sync categories while leaving note and vault-file sync enabled. This keeps each device's theme, plugin settings, credentials, and local source paths separate. Obsidian Sync still carries Markdown files. Follow the [Transcripts desktop and Nomad workflow](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md) for notebook transfer, shared transcript data, and recommended sync order.

## Choose components independently

- **Paper** is an optional Obsidian theme. You can use standard Obsidian with your existing theme and Transcripts without installing Paper.
- **Sidebar** is an optional plugin. It provides navigation and can use standard Obsidian Markdown Preview when Reader is absent.
- **MD Reader** is optional and released separately. Obtain the current version and installation guidance from the [canonical Reader project](https://github.com/ofples/obsidian-md-reader). Install only one plugin with ID `md-reader`, and preserve an existing `data.json` because it stores settings and reading state. This Paper prerelease contains no Reader files.
- **Transcripts** is a separate optional plugin for recognition and page links. It is not included in these ZIPs; see its [repository](https://github.com/ofples/supernote-transcripts) and [desktop/Nomad workflow](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md).

## Licenses

Each component carries its own license files. Paper and Sidebar are licensed under MIT; Paper's bundled Literata fonts retain their SIL Open Font License and attribution files under `fonts/`. Reader carries its own upstream MIT notice. The separate Transcripts companion is GPL-3.0 and is not bundled or relicensed here.
