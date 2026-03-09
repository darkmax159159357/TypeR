# TypeR

**TypeR** is an Adobe Photoshop CEP extension for manga/comic typesetters, with comprehensive bug fixes, improved text centering, and enhanced stability.

**[Download Latest Release (v2.9.4)](https://github.com/darkmax421-pixel/TypeR/raw/main/builds/TypeR-v2.9.4.zip)**

---

## About

TypeR simplifies the routine tasks of working with text in manga and comics, such as placing text on an image, aligning it within speech bubbles, and managing text styles. It is built with React 17 and Webpack 5.

### Key Features

- **Crash-proof Photoshop commands** — All operations are protected to prevent "The command 'Set' is not currently available" crashes.
- **Accurate text centering** — Text boxes are properly sized and centered within selections.
- **Point text handling** — Point text conversion happens after positioning for correct results.
- **Mixed font size support** — Text box resizing accounts for all font sizes in the text.
- **Multi-bubble support** — Place text in multiple speech bubbles simultaneously.
- **Rich text support** — Apply different styles to different parts of the text.
- **RTL/Arabic text support** — Proper handling of right-to-left text and diacritics.
- **Custom themes** — Multiple built-in themes (Obsidian, Neon Pink, Amethyst Night, etc.).

---

## Requirements

- **Windows 8 / macOS 10.9** or newer.
- **Adobe Photoshop CC 2015** or newer.
  *(There may be problems with some portable or lightweight builds.)*

---

## Installation

1. Download and unpack the latest release archive.
2. Close Photoshop (if it is open).
3. Launch `install_win.cmd` (Windows) or `install_mac.sh` (macOS, from Terminal).
4. Open Photoshop and in the upper menu click:
   `Window` > `Extensions` > `TypeR`.

---

## Common Problems

1. **TypeR doesn't appear in extensions list** — Try installing again, making sure Photoshop is closed.
2. **White screen instead of interface** — Your Photoshop build may not support extensions. Try the most complete version.
3. **Photoshop 2022+** — Extension support may be disabled by default. Enable it in:
   `Edit` > `Preferences` > `Plugins` > `Legacy Extensions` > `Load Extension Panels` (check the box).

---

## Available Interface Languages

English, French, German, Portuguese, Russian, Spanish, Turkish, Ukrainian, Vietnamese, Arabic.

---

## Building from Source

```bash
# Install dependencies
npm install

# Development build
npm run build_dev

# Production build
npm run build
```

The built extension files are output to the `app/` directory.

---

## Project Structure

```
TypeR/
├── app_src/           # Source code
│   ├── host.js        # Photoshop ExtendScript (text placement, centering, etc.)
│   ├── context.jsx    # React context/state management
│   ├── hotkeys.jsx    # Keyboard shortcuts
│   ├── utils.js       # Utility functions & Photoshop CEP bridge
│   ├── config.js      # Configuration
│   ├── index.jsx      # React entry point
│   ├── index.scss     # Styles
│   └── components/    # React components (main, modal, etc.)
├── CSXS/
│   └── manifest.xml   # CEP extension manifest
├── icons/             # Extension panel icons
├── locale/            # Interface translations
├── install_win.cmd    # Windows installer
├── install.ps1        # Windows PowerShell installer
├── install_mac.sh     # macOS installer
├── .debug             # CEP debug configuration
├── webpack.config.js  # Webpack build configuration
└── package.json       # Node.js dependencies
```

---

## Developer

**Arcanos AL3mla8**

## Discord

Join for help, feedback, or discussion:
**[Discord Server](https://discord.gg/PZhSh9bJ)**

---

## License

MIT License
