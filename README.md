<div align="center">

  # 🖋️ TypeR

  ### Professional Typesetting Extension for Adobe Photoshop

  *The ultimate tool for manga, comic, and webtoon typesetters*

  [![Release](https://img.shields.io/github/v/release/darkmax159159357/TypeR?style=for-the-badge&color=blue)](https://github.com/darkmax159159357/TypeR/releases/latest)
  [![Downloads](https://img.shields.io/github/downloads/darkmax159159357/TypeR/total?style=for-the-badge&color=green)](https://github.com/darkmax159159357/TypeR/releases)
  [![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/xpjTaFtFjr)

  ---

  **TypeR** is a Photoshop CEP extension that transforms the typesetting workflow.  
  Auto-fit text into speech bubbles, clean text with AI, manage styles — all from one panel.

  </div>

  ---

  ## ✨ Features

  ### 🎯 Smart Text Auto-Fit
  - **Automatic text sizing** — TypeR calculates the optimal font size to fill any speech bubble perfectly
  - **Diamond shaping** — Text naturally follows elliptical bubble shapes using real ellipse-curve math
  - **Smart line distribution** — Intelligent word-wrapping with CJK, Arabic, Thai, and Hindi support
  - **Anti-orphan protection** — Prevents single words dangling on the last line
  - **Horizontal scaling** — Fine-tunes text width for maximum bubble fill

  ### 🫧 Multi-Bubble Paste Mode
  - **Sequential pasting** — Select multiple bubbles, paste translated text line-by-line
  - **Shift+Click multi-select** — Hold Shift to add bubbles to your queue
  - **Auto-advance** — Automatically moves to the next bubble after pasting
  - **Ctrl+Z support** — Undo naturally removes the last placed text and goes back one bubble

  ### 🎨 Style Management
  - **Save & apply styles** — Create reusable text styles with fonts, sizes, colors, and effects
  - **Prefix detection** — Automatically applies styles based on text prefixes (e.g., `[SFX]`, `[NARR]`)
  - **Drag & drop ordering** — Organize styles with drag-and-drop
  - **Folder organization** — Group styles into folders for complex projects
  - **Layer effects** — Save complete layer styles including stroke, shadow, and glow

  ### 🧹 LaMa AI Clean (Offline)
  - **One-click text removal** — Select text area, click Clean — AI removes the text seamlessly
  - **Fully offline** — After initial model download, no internet required
  - **Local processing** — Your files never leave your computer
  - **Zero manual setup** — Everything downloads and configures automatically on first use

  ### 🔍 Auto Clean (YOLO + LaMa Pipeline)
  - **Automatic detection** — YOLOv8 finds all text regions in the entire page
  - **Batch cleaning** — Detects and cleans every text bubble in one click
  - **Smart model download** — Detection model downloads automatically with SHA-256 verification
  - **Progress tracking** — Real-time progress: "Cleaning region 3/8..."

  ### ⌨️ Hotkeys
  - **Customizable shortcuts** — Assign keyboard shortcuts to all major functions
  - **Focus-aware** — Shortcuts only trigger when appropriate (won't interfere with text editing)
  - **Quick paste** — Hotkey for instant text placement in selected bubble

  ### 🌍 Multi-Language Interface
  - **10 languages** — English, Français, Deutsch, Español, Português, Русский, Türkçe, Українська, Tiếng Việt, العربية
  - **RTL support** — Full right-to-left layout for Arabic
  - **Auto-detect** — Matches your Photoshop language setting

  ### 🎭 Themes
  - **10 built-in themes** — Default, Dashboard, Sakura Pink, Volt Green, Amethyst Night, Black Blue, Black Pink, Neon Pink, Obsidian, White Green
  - **Auto-sync** — Adapts to Photoshop's UI brightness

  ### 📝 Markdown Support
  - **Bold & Italic** — Use `**bold**` and `*italic*` in your text
  - **Real font variants** — Resolves actual Bold/Italic fonts from the same family (no synthetic styling)
  - **Mixed formatting** — Combine regular, bold, and italic in a single text layer

  ---

  ## 📥 Installation

  ### Quick Install (Recommended)
  1. Download `TypeR-v2.9.5.zip` from the [Releases](https://github.com/darkmax159159357/TypeR/releases/latest) page
  2. Extract the zip file
  3. Copy the extracted folder to your Photoshop extensions directory:

  | OS | Path |
  |---|---|
  | **Windows** | `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\typertools` |
  | **macOS** | `/Library/Application Support/Adobe/CEP/extensions/typertools` |

  4. Restart Photoshop
  5. Open TypeR from **Window → Extensions → TypeR**

  ### Install Scripts
  - **Windows**: Run `install_win.cmd` as Administrator
  - **macOS**: Run `install_mac.sh` in Terminal

  ### Enable Unsigned Extensions (Required)
  <details>
  <summary>Click to expand</summary>

  **Windows:**
  1. Open Registry Editor (`regedit`)
  2. Navigate to `HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11` (adjust version number)
  3. Add a new String value: `PlayerDebugMode` = `1`

  **macOS:**
  ```bash
  defaults write com.adobe.CSXS.11 PlayerDebugMode 1
  ```

  </details>

  ---

  ## 🖥️ Compatibility

  | Requirement | Details |
  |---|---|
  | **Photoshop** | CC 2019 – 2025+ (CEP 9+) |
  | **OS** | Windows 10/11, macOS 10.14+ |

  > **AI Features (LaMa Clean / Auto Clean):** Everything is fully automatic — models, dependencies, and runtime are all auto-detected and configured on first use. No manual setup needed. A CUDA-compatible GPU is optional but speeds up processing.

  ---

  ## 🚀 Quick Start

  1. **Open a manga/comic page** in Photoshop
  2. **Select a speech bubble** using the Marquee or Lasso tool
  3. **Type or paste** your translated text in the TypeR panel
  4. **Click "Create"** — TypeR auto-fits the text perfectly into the bubble

  ### Multi-Bubble Workflow
  1. Click **Multi-Bubble mode** in the panel
  2. **Paste** your full translated script (one line per bubble)
  3. **Click each bubble** — text places automatically, line by line
  4. **Ctrl+Z** to undo and go back one bubble

  ### AI Text Cleaning
  1. **LaMa Clean**: Select the text area → Click "LaMa Clean" → Done
  2. **Auto Clean**: Just click "Auto Clean" → AI finds and removes ALL text on the page

  ---

  ## 🧠 AI Models & Technical Details

  TypeR uses two AI models for text detection and removal. Both are downloaded automatically on first use.

  ### LaMa — Text Removal (Inpainting)

  | Property | Details |
  |----------|---------|
  | **Model** | big-lama.pt (~410 MB) |
  | **Architecture** | FFCResNetGenerator (Fast Fourier Convolution ResNet) |
  | **Paper** | [Resolution-robust Large Mask Inpainting with Fourier Convolutions](https://arxiv.org/abs/2109.07161) |
  | **Input** | 4-channel (RGB image + binary mask) |
  | **Output** | 3-channel RGB (inpainted result) |
  | **Device** | CUDA (GPU) or CPU — auto-detected |

  <details>
  <summary>Network Architecture</summary>

  ```
  Input (4ch: RGB + Mask)
      │
      ├── 3× Downsampling Convolutions (64 → 128 → 256)
      ├── 18× FFC ResNet Blocks (ratio: 0.75)
      │       └── Fast Fourier Convolution for global context
      ├── 3× Upsampling Convolutions (256 → 128 → 64)
      └── Output (3ch: RGB, sigmoid activation)
  ```

  </details>

  ### YOLOv8 — Text Detection

  | Property | Details |
  |----------|---------|
  | **Model** | public.pt (~52 MB) |
  | **Architecture** | YOLOv8 (Ultralytics) |
  | **Classes** | 2: `text_bubble`, `text_free` |
  | **Input** | Full manga/comic page image |
  | **Output** | Bounding boxes with class labels and confidence scores |
  | **Integrity** | SHA-256 verified on download |

  ### Auto Clean Pipeline

  ```
  Full Page (PNG) → YOLOv8 Detection → For each text region:
      → Create Selection → Capture + Mask → LaMa Inpaint → Apply as Layer
  ```

  ### Storage Locations

  | OS | Path |
  |----|------|
  | **Windows** | `%LOCALAPPDATA%\TypeR_lama\` |
  | **macOS** | `~/Library/Application Support/TypeR_lama/` |

  ```
  TypeR_lama/
  ├── lama-big/
  │   ├── big-lama.pt          # LaMa inpainting model
  │   └── config.yaml          # Model configuration
  ├── detection/
  │   └── public.pt            # YOLOv8 detection model
  └── lama_clean.py            # Inference script
  ```

  ### Auto-Setup Flow

  ```
  Click "LaMa Clean" or "Auto Clean"
      → Auto-detect Python runtime
      → Auto-install packages (torch, pillow, numpy, ultralytics, opencv)
      → Auto-download models (big-lama.pt, public.pt)
      → Run inference — fully automatic, nothing to configure
  ```

  ---

  ## 📋 Changelog

  ### v2.9.5
  - Auto Clean: YOLO + LaMa automatic text detection and removal pipeline
  - Detection model auto-download with SHA-256 integrity verification
  - LaMa AI Clean: fully offline text removal
  - Improved auto-fit with ellipse-based diamond shaping
  - Ctrl+Z natural undo support in multi-bubble mode
  - Real Bold/Italic font variant resolution (no more synthetic styling)
  - History panel cleanup
  - Fixed multi-bubble text alignment and selection indexing

  ---

  ## 💬 Community

  Join our Discord server for support, feature requests, and updates:

  [![Discord](https://img.shields.io/badge/Join_Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/xpjTaFtFjr)

  ---

  ## 🤖 Manga Extraction Bot

  Need high-quality manga raws? Join our extraction bot server:

  [![Extraction Bot](https://img.shields.io/badge/Extraction_Bot-Join_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/2D2XBWFttY)

  ---

  ## 📚 References

  - **LaMa**: Suvorov et al., *"Resolution-robust Large Mask Inpainting with Fourier Convolutions"*, WACV 2022 — [Paper](https://arxiv.org/abs/2109.07161) | [GitHub](https://github.com/advimman/lama)
  - **YOLOv8**: Ultralytics — [GitHub](https://github.com/ultralytics/ultralytics) | [Docs](https://docs.ultralytics.com)

  ---

  <div align="center">

  **Made with ❤️ for the typesetting community**

  *TypeR — Because every bubble deserves perfect text*

  </div>
  