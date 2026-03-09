import zipfile
import os

VERSION = "2.9.5"
ZIP_NAME = f"TypeR-v{VERSION}.zip"
PREFIX = f"TypeR-v{VERSION}/"

INCLUDE_DIRS = [
    ("app",    "app"),
    ("CSXS",   "CSXS"),
    ("icons",  "icons"),
    ("locale", "locale"),
]

INCLUDE_ROOT_FILES = [
    "install_win.cmd",
    "install_mac.sh",
    "install.ps1",
    "LICENSE.md",
    "README.md",
]

if os.path.exists(ZIP_NAME):
    os.remove(ZIP_NAME)

with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as zf:
    for src_dir, zip_dir in INCLUDE_DIRS:
        if not os.path.isdir(src_dir):
            print(f"  [SKIP] directory not found: {src_dir}")
            continue
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for file in files:
                if file.startswith('.') or file.endswith('.map'):
                    continue
                full_path = os.path.join(root, file)
                rel = os.path.relpath(full_path, src_dir)
                arc_name = PREFIX + zip_dir + "/" + rel.replace("\\", "/")
                zf.write(full_path, arc_name)

    for fname in INCLUDE_ROOT_FILES:
        if os.path.exists(fname):
            zf.write(fname, PREFIX + fname)
        else:
            print(f"  [SKIP] file not found: {fname}")

    entries = len(zf.namelist())

size_kb = round(os.path.getsize(ZIP_NAME) / 1024)
print(f"Done: {ZIP_NAME}  ({size_kb} KB, {entries} entries)")
