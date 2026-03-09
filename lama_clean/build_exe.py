import PyInstaller.__main__
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
main_script = os.path.join(script_dir, "lama_clean.py")

PyInstaller.__main__.run([
    main_script,
    "--onefile",
    "--name=lama_clean",
    "--console",
    "--noconfirm",
    "--clean",
])

print("\nBuild complete!")
print("Executable location: dist/lama_clean" + (".exe" if sys.platform == "win32" else ""))
print("\nDistribution structure:")
print("  your_folder/")
print("    lama_clean.exe      (or lama_clean on Mac/Linux)")
print("    lama-big/")
print("      big-lama.pt       (model file)")
