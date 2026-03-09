# LaMa Clean - Local Inpainting for TypeR

## Building the Executable

### Prerequisites
- Python 3.8+
- pip

### Steps

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Build the executable:
```bash
python build_exe.py
```

3. The executable will be created in `dist/lama_clean.exe` (Windows) or `dist/lama_clean` (Mac/Linux).

### Distribution

Create a folder with this structure:
```
TypeR-LaMa/
  lama_clean.exe    (the built executable)
  lama-big/
    big-lama.pt     (the LaMa model file)
```

Users need to:
1. Download this folder
2. In TypeR Settings > AI Clean, set the path to the `TypeR-LaMa` folder
3. Click "AI Clean" button to clean selected areas

### Manual Testing

```bash
python lama_clean.py --model-dir ./lama-big --input test_image.jpg --mask test_mask.png --output result.png
```

The mask should be a grayscale image where white (255) = areas to clean, black (0) = areas to keep.
