# Install Obsidian Paper components

This guide works with each component ZIP and the optional combined ZIP. Open the [v0.5.12 prerelease page](https://github.com/ofples/obsidian-paper/releases/tag/v0.5.12) or the [GitHub Releases list](https://github.com/ofples/obsidian-paper/releases). If the v0.5.12 prerelease is not visible yet, wait for publication.

Download the named ZIP asset for each component you want. Do not use GitHub's automatically generated **Source code** ZIP or TAR archives; they are source snapshots, not installable packages. `SHA256SUMS.txt` is published alongside the component ZIPs so you can compare the downloaded files before extracting them.

On Windows, calculate a downloaded ZIP's hash in PowerShell with `Get-FileHash .\supernote-paper-0.5.10.zip -Algorithm SHA256` (replace the filename for another asset), then compare its `Hash` value with the matching line in `SHA256SUMS.txt`.

| Release asset | Folder at the top of the extracted ZIP | Install destination under the active Obsidian configuration |
| --- | --- | --- |
| `supernote-paper-0.5.10.zip` | `Supernote Paper/` | `themes/Supernote Paper/` |
| `supernote-sidebar-0.4.2.zip` | `supernote-sidebar/` | `plugins/supernote-sidebar/` |
| `md-reader-2.1.3.zip` | `md-reader/` | `plugins/md-reader/` |
| `obsidian-paper-0.5.12.zip` | `obsidian-paper-0.5.12/` containing `themes/` and `plugins/` | Copy only the component folders you chose from its `themes/` and `plugins/` subfolders |

## Install on desktop or Nomad

1. Choose the active Obsidian configuration folder. On desktop, keep using your existing profile; you can leave its current theme in place. On Nomad, select a separate folder such as `.obsidian-supernote` in **Settings → Files and links → Override config folder**, then restart Obsidian. Do not copy your desktop's Obsidian settings into the Nomad profile.
2. Close Obsidian on the device where you will install or update the component.
3. Extract the ZIP, then copy the component folder from the table into the matching `themes/` or `plugins/` folder inside the active configuration folder. The `themes` and `plugins` folders may need to be created. With the combined ZIP, copy only the component folders you want.
4. To update a component, copy its package files into the existing component folder. Do not delete or replace the whole folder; preserve existing `data.json`, state files, settings, and reading positions. For a fresh Reader installation only, you may copy `Supernote defaults.json` to `data.json`; never use it to replace an existing file.
5. Reopen Obsidian. If you installed Paper, select **Supernote Paper** under Appearance. If you installed Sidebar or Reader, enable each one manually under Community plugins. Nothing in the ZIPs automatically enables plugins, copies settings, or starts recognition.

For the Nomad profile, disable Obsidian Sync's **Vault configuration** sync categories while leaving note and vault-file sync enabled. This keeps each device's theme, plugin settings, credentials, and local source paths separate. Obsidian Sync still carries Markdown files. Follow the [Transcripts desktop and Nomad workflow](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md) for notebook transfer, shared transcript data, and recommended sync order.

## Choose components independently

- **Paper** is an optional Obsidian theme. You can use standard Obsidian with your existing theme and Transcripts without installing Paper.
- **Sidebar** is an optional plugin. It provides navigation and can use standard Obsidian Markdown Preview when Reader is absent.
- **MD Reader** is optional and supplies paginated Book reading. The package contains this project's [canonical Supernote fork](https://github.com/ofples/obsidian-md-reader); the upstream Reader and this fork use the same `md-reader` plugin ID, so install only one. Preserve an existing Reader `data.json` because it stores your settings and reading state. `Supernote defaults.json` is an optional sample for a fresh installation only; never replace an existing `data.json` with it.
- **Android Digest handoff** is optional and requires the separate Supernote Bridge 0.4.0 app. The Paper bundle does not include or install Bridge or Transcripts, and it does not perform a Save action. See the [Reader integration guide](https://github.com/ofples/obsidian-md-reader/blob/30a51e694655f922850f2bc38d264d1509242b23/INTEGRATION.md) for the handoff behavior and limits.
- **Transcripts** is a separate optional plugin for recognition and page links. It is not included in these ZIPs; see its [repository](https://github.com/ofples/supernote-transcripts) and [desktop/Nomad workflow](https://github.com/ofples/supernote-transcripts/blob/main/docs/workflow.md).

## Licenses

Each component carries its own license files. Paper and Sidebar are licensed under MIT; Paper's bundled Literata fonts retain their SIL Open Font License and attribution files under `fonts/`. Reader carries its own upstream MIT notice. The separate Transcripts companion is GPL-3.0 and is not bundled or relicensed here.
