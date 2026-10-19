#!/usr/bin/env python3
"""Build the four deterministic, allowlisted Obsidian Paper release archives."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path, PurePosixPath
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "artifacts" / "v0.5.14"
ZIP_TIME = (1980, 1, 1, 0, 0, 0)

THEME_FILES = (
    "theme.css",
    "manifest.json",
    "LICENSE",
    "Adjustments.css.example",
    "fonts/FONT-ATTRIBUTION.txt",
    "fonts/Literata-Italic[opsz,wght].ttf",
    "fonts/Literata[opsz,wght].ttf",
    "fonts/OFL-Literata.txt",
)
SIDEBAR_FILES = ("main.js", "styles.css", "manifest.json", "LICENSE")
READER_REQUIRED_FILES = ("main.js", "styles.css", "manifest.json", "LICENSE")
READER_OPTIONAL_FILES = ("Supernote defaults.json",)
READER_PINNED_FILES = ("main.js", "styles.css", "manifest.json", "LICENSE")
NOTICE_FILES = ("THIRD_PARTY_NOTICES.md", "INSTALL.md")

ACCEPTED_RUNTIME_FILES = (
    "themes/Supernote Paper/theme.css",
    "themes/Supernote Paper/manifest.json",
    "plugins/supernote-sidebar/main.js",
    "plugins/supernote-sidebar/styles.css",
    "plugins/supernote-sidebar/manifest.json",
    "plugins/md-reader/main.js",
    "plugins/md-reader/styles.css",
    "plugins/md-reader/manifest.json",
    "plugins/md-reader/LICENSE",
    "themes/Supernote Paper/LICENSE",
    "plugins/supernote-sidebar/LICENSE",
)

MACHINE_PATH = re.compile(
    rb"(?i)(?:[a-z]:[\\/](?:users|documents|home|tmp|workspace)[\\/]|"
    rb"/(?:users|home|sdcard|mnt)/[^\s\"']+)"
)


class ReleaseError(RuntimeError):
    pass


@dataclass(frozen=True)
class Member:
    archive_path: str
    source_path: str
    data: bytes


def fail(message: str) -> None:
    raise ReleaseError(message)


def validate_relative_path(value: str) -> PurePosixPath:
    if "\\" in value:
        fail(f"Archive paths must use forward slashes: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or not path.parts or any(part in ("", ".", "..") for part in path.parts):
        fail(f"Unsafe archive path: {value!r}")
    return path


def source_file(relative_path: str) -> tuple[Path, bytes]:
    relative = validate_relative_path(relative_path)
    current = ROOT
    for part in relative.parts:
        current = current / part
        try:
            metadata = current.lstat()
        except FileNotFoundError:
            fail(f"Required release input is missing: {relative_path}")
        if stat.S_ISLNK(metadata.st_mode):
            fail(f"Symlinks are not allowed in release inputs: {relative_path}")
    if not stat.S_ISREG(metadata.st_mode):
        fail(f"Release input is not a regular file: {relative_path}")
    data = current.read_bytes()
    if not data:
        fail(f"Release input is empty: {relative_path}")
    return current, data


def inventory_directory(relative_path: str, allowed: Iterable[str], optional: Iterable[str] = ()) -> set[str]:
    base_rel = validate_relative_path(relative_path)
    base = ROOT.joinpath(*base_rel.parts)
    try:
        metadata = base.lstat()
    except FileNotFoundError:
        fail(f"Release component directory is missing: {relative_path}")
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
        fail(f"Release component path must be a real directory: {relative_path}")

    found: set[str] = set()

    def visit(folder: Path, prefix: str) -> None:
        try:
            entries = sorted(os.scandir(folder), key=lambda entry: entry.name)
        except OSError as error:
            fail(f"Cannot inspect release directory {folder.name}: {error}")
        for entry in entries:
            rel = f"{prefix}/{entry.name}" if prefix else entry.name
            validate_relative_path(rel)
            if entry.is_symlink():
                fail(f"Symlinks are not allowed in release inputs: {relative_path}/{rel}")
            if entry.is_dir(follow_symlinks=False):
                visit(Path(entry.path), rel)
            elif entry.is_file(follow_symlinks=False):
                found.add(rel)
            else:
                fail(f"Unsupported filesystem entry in release input: {relative_path}/{rel}")

    visit(base, "")
    allowed_set = set(allowed)
    optional_set = set(optional)
    unexpected = sorted(found - allowed_set - optional_set)
    missing = sorted(allowed_set - found)
    if unexpected:
        fail(f"Unexpected files in {relative_path}: {', '.join(unexpected)}")
    if missing:
        fail(f"Missing files in {relative_path}: {', '.join(missing)}")
    return found


def read_json(relative_path: str) -> tuple[dict, bytes]:
    _, data = source_file(relative_path)
    try:
        value = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        fail(f"Invalid JSON in {relative_path}: {error}")
    if not isinstance(value, dict):
        fail(f"Expected a JSON object in {relative_path}")
    return value, data


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require_version(manifest: dict, expected: str, label: str) -> None:
    if manifest.get("version") != expected:
        fail(f"{label} version does not match bundle-lock.json (expected {expected})")


def check_component_inputs() -> tuple[dict, dict, dict, dict, dict[str, bytes]]:
    lock, _ = read_json("bundle-lock.json")
    project, _ = read_json("package.json")
    accepted, _ = read_json("docs/accepted-artifacts.json")
    theme, _ = read_json("dist/themes/Supernote Paper/manifest.json")
    sidebar, _ = read_json("dist/plugins/supernote-sidebar/manifest.json")
    reader, _ = read_json("dist/plugins/md-reader/manifest.json")

    if lock.get("schemaVersion") != 1:
        fail("Unsupported bundle-lock schema version")
    if lock.get("version") != project.get("version") or accepted.get("version") != project.get("version"):
        fail("package.json, bundle-lock.json, and accepted-artifacts.json versions must agree")
    if project.get("version") != "0.5.14":
        fail("This release packager is pinned to project version 0.5.14")

    components = lock.get("components")
    if not isinstance(components, dict) or set(components) != {"paper", "sidebar", "reader"}:
        fail("bundle-lock.json must describe exactly Paper, Sidebar, and Reader")
    paper_pin = components["paper"]
    sidebar_pin = components["sidebar"]
    reader_pin = components["reader"]
    expected_component_versions = {"paper": "0.5.11", "sidebar": "0.4.4", "reader": "2.2.0"}
    for key, expected in expected_component_versions.items():
        if not isinstance(components[key], dict) or components[key].get("version") != expected:
            fail(f"This release packager expects {key} version {expected}")
    require_version(theme, paper_pin.get("version"), "Paper manifest")
    require_version(sidebar, sidebar_pin.get("version"), "Sidebar manifest")
    require_version(reader, reader_pin.get("version"), "Reader manifest")
    if theme.get("name") != paper_pin.get("name") or theme.get("license") != paper_pin.get("license"):
        fail("Paper manifest identity or license does not match bundle-lock.json")
    if sidebar.get("id") != sidebar_pin.get("id") or sidebar.get("license") != sidebar_pin.get("license"):
        fail("Sidebar manifest identity or license does not match bundle-lock.json")
    if reader.get("id") != reader_pin.get("id"):
        fail("Reader manifest identity does not match bundle-lock.json")
    reader_source = reader_pin.get("source")
    if not isinstance(reader_source, dict) or not re.fullmatch(r"[0-9a-f]{40}", str(reader_source.get("commit", ""))):
        fail("Reader lock must include a full canonical source commit")

    theme_dir = "dist/themes/Supernote Paper"
    sidebar_dir = "dist/plugins/supernote-sidebar"
    reader_dir = "dist/plugins/md-reader"
    inventory_directory(theme_dir, THEME_FILES)
    inventory_directory(sidebar_dir, SIDEBAR_FILES)
    reader_files = inventory_directory(reader_dir, READER_REQUIRED_FILES, READER_OPTIONAL_FILES)

    install_path = "docs/release-install.md"
    _, install_bytes = source_file(install_path)
    _, notices_bytes = source_file("THIRD_PARTY_NOTICES.md")
    root_license_path = "LICENSE"
    _, root_license = source_file(root_license_path)

    # Ensure copied component notices and font license material remain present.
    for component_license in (
        f"{theme_dir}/LICENSE",
        f"{sidebar_dir}/LICENSE",
    ):
        _, component_bytes = source_file(component_license)
        if component_bytes != root_license:
            fail(f"Component license differs from repository LICENSE: {component_license}")
    _, reader_license = source_file(f"{reader_dir}/LICENSE")
    _, vendor_reader_license = source_file("vendor/md-reader/LICENSE")
    if reader_license != vendor_reader_license:
        fail("Bundled Reader license differs from the pinned vendor license")
    normalized_notices = " ".join(notices_bytes.decode("utf-8").split()).casefold()
    for notice in ("MIT License", "SIL Open Font License", "GPL-3.0"):
        if notice.casefold() not in normalized_notices:
            fail(f"THIRD_PARTY_NOTICES.md is missing the {notice} notice")
    for font_file in THEME_FILES:
        if font_file.startswith("fonts/"):
            source_file(f"src/theme/{font_file}")
            _, dist_bytes = source_file(f"{theme_dir}/{font_file}")
            _, source_bytes = source_file(f"src/theme/{font_file}")
            if dist_bytes != source_bytes:
                fail(f"Packaged Paper font asset differs from source: {font_file}")

    # These folders are the complete package inputs, not candidate roots for
    # recursive copying. The inventories above reject every unlisted member.
    reader_files_set = set(READER_REQUIRED_FILES) | (set(READER_OPTIONAL_FILES) & reader_files)
    if set(reader_pin.get("files", {})) != set(READER_PINNED_FILES):
        fail("Reader lock must pin exactly its four canonical artifact files")

    accepted_files = accepted.get("files")
    if not isinstance(accepted_files, dict) or set(accepted_files) != set(ACCEPTED_RUNTIME_FILES):
        fail("accepted-artifacts.json must cover exactly the 11 release runtime files")
    collected: dict[str, bytes] = {}
    for relative_path in ACCEPTED_RUNTIME_FILES:
        _, data = source_file(f"dist/{relative_path}")
        if digest(data) != accepted_files[relative_path]:
            fail(f"Release input does not match accepted artifact hash: dist/{relative_path}")
        collected[relative_path] = data

    for filename, expected_hash in reader_pin["files"].items():
        path = f"dist/plugins/md-reader/{filename}"
        if path not in {f"dist/{item}" for item in ACCEPTED_RUNTIME_FILES}:
            fail(f"Reader lock refers to a non-runtime file: {filename}")
        if digest(collected[path.removeprefix("dist/")]) != expected_hash:
            fail(f"Reader input does not match bundle-lock.json: {filename}")

    # Read all allowlisted release members now, before any output is written.
    for relative_path in (
        *(f"{theme_dir}/{name}" for name in THEME_FILES),
        *(f"{sidebar_dir}/{name}" for name in SIDEBAR_FILES),
        *(f"{reader_dir}/{name}" for name in READER_REQUIRED_FILES),
        *(f"{reader_dir}/{name}" for name in READER_OPTIONAL_FILES if name in reader_files_set),
        install_path,
        "THIRD_PARTY_NOTICES.md",
        root_license_path,
        "bundle-lock.json",
    ):
        _, data = source_file(relative_path)
        if relative_path.endswith((".md", ".css", ".js", ".json", ".txt", ".example", "/LICENSE", "LICENSE")):
            if MACHINE_PATH.search(data):
                fail(f"Machine-specific absolute path found in release input: {relative_path}")

    return lock, project, accepted, reader_pin, collected


def git_source_state(allow_dirty: bool) -> tuple[str, bool]:
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        fail("Could not determine sourceCommit from Git HEAD")
    if not re.fullmatch(r"[0-9a-f]{40,64}", commit):
        fail("Git HEAD is not a full commit ID")
    try:
        status = subprocess.check_output(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.CalledProcessError):
        fail("Could not determine whether the source checkout is dirty")
    dirty = bool(status.strip())
    if dirty and not allow_dirty:
        fail("Source checkout has tracked or untracked changes; pass --allow-dirty for a development package")
    return commit, dirty


def make_member(archive_path: str, source_path: str) -> Member:
    archive_rel = validate_relative_path(archive_path).as_posix()
    _, data = source_file(source_path)
    if archive_rel.lower().endswith("data.json"):
        fail("Saved plugin settings must never be packaged")
    return Member(archive_rel, source_path, data)


def package_members() -> list[dict]:
    install_source = "docs/release-install.md"
    notices_source = "THIRD_PARTY_NOTICES.md"
    members: list[dict] = []

    def component(top: str, source_dir: str, names: Iterable[str]) -> list[Member]:
        return [make_member(f"{top}/{name}", f"{source_dir}/{name}") for name in names]

    theme_assets = component("Supernote Paper", "dist/themes/Supernote Paper", THEME_FILES)
    sidebar_assets = component("supernote-sidebar", "dist/plugins/supernote-sidebar", SIDEBAR_FILES)
    reader_inventory = inventory_directory(
        "dist/plugins/md-reader", READER_REQUIRED_FILES, READER_OPTIONAL_FILES
    )
    reader_assets = component("md-reader", "dist/plugins/md-reader", READER_REQUIRED_FILES)
    if "Supernote defaults.json" in reader_inventory:
        reader_assets += component("md-reader", "dist/plugins/md-reader", READER_OPTIONAL_FILES)

    def docs(top: str) -> list[Member]:
        return [
            make_member(f"{top}/THIRD_PARTY_NOTICES.md", notices_source),
            make_member(f"{top}/INSTALL.md", install_source),
        ]

    members.append({
        "name": "supernote-paper-0.5.11.zip",
        "version": "0.5.11",
        "members": theme_assets + docs("Supernote Paper"),
    })
    members.append({
        "name": "supernote-sidebar-0.4.4.zip",
        "version": "0.4.4",
        "members": sidebar_assets + docs("supernote-sidebar"),
    })
    members.append({
        "name": "md-reader-2.2.0.zip",
        "version": "2.2.0",
        "members": reader_assets + docs("md-reader"),
    })

    combined: list[Member] = []
    combined.extend(component("obsidian-paper-0.5.14/themes/Supernote Paper", "dist/themes/Supernote Paper", THEME_FILES))
    combined.extend(component("obsidian-paper-0.5.14/plugins/supernote-sidebar", "dist/plugins/supernote-sidebar", SIDEBAR_FILES))
    combined.extend(component("obsidian-paper-0.5.14/plugins/md-reader", "dist/plugins/md-reader", READER_REQUIRED_FILES))
    if "Supernote defaults.json" in reader_inventory:
        combined.extend(component("obsidian-paper-0.5.14/plugins/md-reader", "dist/plugins/md-reader", READER_OPTIONAL_FILES))
    combined.extend([
        make_member("obsidian-paper-0.5.14/LICENSE", "LICENSE"),
        make_member("obsidian-paper-0.5.14/THIRD_PARTY_NOTICES.md", notices_source),
        make_member("obsidian-paper-0.5.14/INSTALL.md", install_source),
        make_member("obsidian-paper-0.5.14/bundle-lock.json", "bundle-lock.json"),
    ])
    members.append({"name": "obsidian-paper-0.5.14.zip", "version": "0.5.14", "members": combined})
    return members


def create_zip(members: list[Member]) -> bytes:
    expected = [member.archive_path for member in members]
    if len(expected) != len(set(expected)):
        fail("Duplicate archive member path")
    for path in expected:
        validate_relative_path(path)
    stream = BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for member in sorted(members, key=lambda value: value.archive_path):
            info = zipfile.ZipInfo(member.archive_path, date_time=ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.flag_bits |= 0x800
            archive.writestr(info, member.data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    result = stream.getvalue()
    with zipfile.ZipFile(BytesIO(result), "r") as archive:
        names = archive.namelist()
        if names != sorted(expected):
            fail("ZIP member list failed the post-write validation")
        if archive.testzip() is not None:
            fail("ZIP CRC validation failed")
        for member in members:
            if archive.read(member.archive_path) != member.data:
                fail(f"ZIP member differs from approved input: {member.archive_path}")
    return result


def output_directory(path: str | None) -> Path:
    requested = Path(path) if path else DEFAULT_OUTPUT
    if not requested.is_absolute():
        requested = ROOT / requested
    if requested.exists() and requested.is_symlink():
        fail("Output directory cannot be a symlink")
    resolved = requested.resolve()
    try:
        relative = resolved.relative_to(ROOT)
    except ValueError:
        return resolved
    if not relative.parts or relative.parts[0] != "artifacts":
        fail("Output inside the repository must stay under artifacts/")
    return resolved


def write_release(
    output: Path,
    package_data: list[dict],
    source_commit: str,
    source_dirty: bool,
    lock: dict,
    project: dict,
) -> None:
    if output.exists() and not output.is_dir():
        fail("Output path exists and is not a directory")
    output.mkdir(parents=True, exist_ok=True)
    if output.is_symlink():
        fail("Output directory cannot be a symlink")

    archive_bytes: dict[str, bytes] = {}
    archive_records = []
    for package in package_data:
        members: list[Member] = package["members"]
        content = create_zip(members)
        archive_bytes[package["name"]] = content
        archive_records.append({
            "archive": package["name"],
            "version": package["version"],
            "size": len(content),
            "sha256": digest(content),
            "members": [
                {"path": item.archive_path, "size": len(item.data), "sha256": digest(item.data)}
                for item in sorted(members, key=lambda value: value.archive_path)
            ],
        })

    manifest = {
        "schemaVersion": 1,
        "sourceCommit": source_commit,
        "sourceDirty": source_dirty,
        "projectVersion": project["version"],
        "bundleLockVersion": lock["version"],
        "components": {
            key: {
                "version": value["version"],
                "id": value.get("id"),
                "name": value.get("name"),
                **({"sourceCommit": value["source"]["commit"]} if isinstance(value.get("source"), dict) else {}),
            }
            for key, value in lock["components"].items()
        },
        "archives": archive_records,
    }
    manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode("utf-8")

    outputs = {**archive_bytes, "release-manifest.json": manifest_bytes}
    sums_path = output / "SHA256SUMS.txt"
    expected_paths = [output / name for name in outputs] + [sums_path]
    for path in expected_paths:
        if path.is_symlink():
            fail(f"Refusing to overwrite a symlink output: {path.name}")
        if path.exists() and not path.is_file():
            fail(f"Output asset exists and is not a regular file: {path.name}")
    for name, data in outputs.items():
        (output / name).write_bytes(data)
    sums = "".join(f"{digest(data)}  {name}\n" for name, data in sorted(outputs.items()))
    sums_path.write_text(sums, encoding="ascii", newline="\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", help="output directory (default: artifacts/v0.5.14)")
    parser.add_argument(
        "--allow-dirty",
        action="store_true",
        help="allow packaging from a modified checkout and record sourceDirty=true",
    )
    args = parser.parse_args(argv)
    try:
        lock, project, _accepted, _reader_pin, _runtime = check_component_inputs()
        packages = package_members()
        source_commit, source_dirty = git_source_state(args.allow_dirty)
        write_release(output_directory(args.output), packages, source_commit, source_dirty, lock, project)
    except ReleaseError as error:
        print(f"Release packaging failed: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Release packaging failed: {error}", file=sys.stderr)
        return 1
    print(f"Created four release archives and manifests under {output_directory(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
