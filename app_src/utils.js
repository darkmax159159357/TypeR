import "./lib/CSInterface";

const csInterface = new window.CSInterface();
const path = csInterface.getSystemPath(window.SystemPath.EXTENSION);
const storagePath = path + "/storage";

let locale = {};

const openUrl = window.cep.util.openURLInDefaultBrowser;

const checkUpdate = async (currentVersion) => {
  try {
    const response = await fetch(
      "https://api.github.com/repos/darkmax159159357/TypeR/releases",
      { headers: { Accept: "application/vnd.github.v3.html+json" } }
    );
    if (!response.ok) return null;
    const releases = await response.json();
    
    const parseVersion = (version) => {
      const cleanVersion = version.replace(/^v/, '');
      return cleanVersion.split('.').map(num => parseInt(num, 10));
    };
    
    const compareVersions = (v1, v2) => {
      const version1 = parseVersion(v1);
      const version2 = parseVersion(v2);
      
      for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
        const num1 = version1[i] || 0;
        const num2 = version2[i] || 0;
        
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
      }
      return 0;
    };
    
    const currentVersionClean = currentVersion.replace(/^v/, '');
    const newerReleases = releases.filter(release => {
      const releaseVersion = release.tag_name.replace(/^v/, '');
      return compareVersions(releaseVersion, currentVersionClean) > 0;
    });
    
    if (newerReleases.length > 0) {
      newerReleases.sort((a, b) => compareVersions(b.tag_name, a.tag_name));
      
      // Get the download URL for the latest release ZIP
      const latestRelease = newerReleases[0];
      let downloadUrl = null;
      
      // Try to find TypeR.zip in assets first
      if (latestRelease.assets && latestRelease.assets.length > 0) {
        const zipAsset = latestRelease.assets.find(a => 
          a.name.toLowerCase().endsWith('.zip') && 
          a.name.toLowerCase().includes('typer')
        );
        if (zipAsset) {
          downloadUrl = zipAsset.browser_download_url;
        }
      }
      // Fallback to zipball_url (source code zip)
      if (!downloadUrl) {
        downloadUrl = latestRelease.zipball_url;
      }
      
      return {
        version: newerReleases[0].tag_name,
        downloadUrl: downloadUrl,
        releases: newerReleases.map(release => ({
          version: release.tag_name,
          body: release.body_html || release.body,
          published_at: release.published_at
        }))
      };
    }
  } catch (e) {
    console.error("Update check failed", e);
  }
  return null;
};

const getOSType = () => {
  const os = csInterface.getOSInformation();
  if (os && os.toLowerCase().indexOf('mac') !== -1) {
    return 'mac';
  }
  return 'win';
};

const downloadAndInstallUpdate = async (downloadUrl, onProgress, onComplete, onError) => {
  try {
    const osType = getOSType();
    
    // Get user's Downloads folder
    const userHome = osType === 'win' 
      ? csInterface.getSystemPath(window.SystemPath.USER_DATA).split('/AppData/')[0]
      : csInterface.getSystemPath(window.SystemPath.USER_DATA).replace('/Library/Application Support', '');
    
    const downloadsPath = osType === 'win'
      ? `${userHome}/Downloads/TypeR_Update`
      : `${userHome}/Downloads/TypeR_Update`;
    
    const zipPath = `${downloadsPath}/TypeR.zip`;
    
    onProgress && onProgress(locale.updateDownloading || 'Downloading update...');
    
    // Clean and create download directory
    csInterface.evalScript(`deleteFolder("${downloadsPath.replace(/\\/g, '\\\\').replace(/\//g, '\\\\')}")`, () => {
      // Use cep.fs to create directory
      const mkdirResult = window.cep.fs.makedir(downloadsPath);
      if (mkdirResult.err && mkdirResult.err !== 0 && mkdirResult.err !== 17) { // 17 = already exists
        onError && onError('Failed to create download directory');
        return;
      }
      
      // Download the ZIP file
      fetch(downloadUrl, {
        headers: { Accept: 'application/octet-stream' }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64 for file writing
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = window.btoa(binary);
        
        onProgress && onProgress(locale.updateExtracting || 'Extracting files...');
        
        // Write ZIP file using base64 encoding
        const writeResult = window.cep.fs.writeFile(zipPath, base64Data, window.cep.encoding.Base64);
        if (writeResult.err) {
          throw new Error('Failed to write ZIP file');
        }
        
        // Create the auto-install script
        if (osType === 'win') {
          // Windows: Create PowerShell install script
          const installScript = `# TypeR Auto-Update Script
# This script will install the update after Photoshop is closed
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$zipPath = Join-Path $ScriptDir "TypeR.zip"
$extractPath = Join-Path $ScriptDir "extracted"
$AppData = $env:APPDATA
$TargetDir = Join-Path $AppData "Adobe\\CEP\\extensions\\typertools"
$TempBackupContainer = Join-Path $env:TEMP "typer_backup_container"

Write-Host "+------------------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|                      TypeR Auto-Updater                          |" -ForegroundColor Cyan
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# Check if Photoshop is running
$psProcess = Get-Process -Name "Photoshop" -ErrorAction SilentlyContinue
if ($psProcess) {
    Write-Host "[!] Photoshop is running. Please close it first." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter after closing Photoshop..."
}

Write-Host "[*] Installing update..." -ForegroundColor Cyan

# Cleanup temp backup
if (Test-Path $TempBackupContainer) { Remove-Item $TempBackupContainer -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -Path $TempBackupContainer -ItemType Directory -Force | Out-Null

# Backup storage
if (Test-Path "$TargetDir\\storage") {
    Copy-Item "$TargetDir\\storage" -Destination $TempBackupContainer -Recurse -Force -ErrorAction SilentlyContinue
}

# Extract ZIP
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
New-Item -Path $extractPath -ItemType Directory -Force | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

# Find content folder - check if files are at root or in a subfolder
# If CSXS folder exists at root, files are directly there
# Otherwise, look for a subfolder containing CSXS
if (Test-Path "$extractPath\\CSXS") {
    $sourcePath = $extractPath
} else {
    $contentFolder = Get-ChildItem -Path $extractPath -Directory | Where-Object { Test-Path "$($_.FullName)\\CSXS" } | Select-Object -First 1
    if ($contentFolder) {
        $sourcePath = $contentFolder.FullName
    } else {
        $sourcePath = $extractPath
    }
}

# Clean target directory
if (Test-Path $TargetDir) {
    Remove-Item $TargetDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -Path $TargetDir -ItemType Directory -Force | Out-Null

# Copy files
$FoldersToCopy = @("app", "CSXS", "icons", "locale")
foreach ($folder in $FoldersToCopy) {
    $src = Join-Path $sourcePath $folder
    $dst = Join-Path $TargetDir $folder
    if (Test-Path $src) {
        Copy-Item $src -Destination $dst -Recurse -Force
    }
}

# Copy themes
if (Test-Path "$sourcePath\\themes") {
    $ThemeDest = "$TargetDir\\app\\themes"
    if (-not (Test-Path $ThemeDest)) { New-Item $ThemeDest -ItemType Directory -Force | Out-Null }
    Copy-Item "$sourcePath\\themes\\*" -Destination $ThemeDest -Recurse -Force
}

# Restore storage
if (Test-Path "$TempBackupContainer\\storage") {
    Copy-Item "$TempBackupContainer\\storage" -Destination "$TargetDir" -Recurse -Force
}

# Cleanup
if (Test-Path $TempBackupContainer) { Remove-Item $TempBackupContainer -Recurse -Force -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Green
Write-Host "|                      Update Complete!                            |" -ForegroundColor Green
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "You can now open Photoshop and use TypeR." -ForegroundColor Cyan
Write-Host ""
Write-Host "This folder will be deleted automatically." -ForegroundColor DarkGray
Read-Host "Press Enter to exit..."

# Cleanup update folder - delete the entire TypeR_Update folder
$parentDir = Split-Path $ScriptDir -Parent
$folderName = Split-Path $ScriptDir -Leaf
Set-Location $parentDir
Remove-Item $ScriptDir -Recurse -Force -ErrorAction SilentlyContinue
`;
          
          const cmdScript = `@echo off
cd /d "%~dp0"
PowerShell -NoProfile -ExecutionPolicy Bypass -File "install_update.ps1"
`;
          
          const psScriptPath = `${downloadsPath}/install_update.ps1`;
          const cmdScriptPath = `${downloadsPath}/install_update.cmd`;
          
          window.cep.fs.writeFile(psScriptPath, installScript);
          window.cep.fs.writeFile(cmdScriptPath, cmdScript);
          
          onProgress && onProgress(locale.updateReady || 'Update ready to install...');
          
          // Open the folder in Explorer
          csInterface.evalScript(`openFolder("${downloadsPath.replace(/\\/g, '\\\\').replace(/\//g, '\\\\')}")`, () => {
            onComplete && onComplete(true); // true = needs manual step
          });
          
        } else {
          // macOS: Create shell install script
          const installScript = `#!/bin/bash
# TypeR Auto-Update Script

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ZIP_PATH="$SCRIPT_DIR/TypeR.zip"
EXTRACT_PATH="$SCRIPT_DIR/extracted"
DEST_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/typertools"
TEMP_STORAGE="$SCRIPT_DIR/__storage_backup"

echo "+------------------------------------------------------------------+"
echo "|                      TypeR Auto-Updater                          |"
echo "+------------------------------------------------------------------+"
echo ""

# Check if Photoshop is running
if pgrep -x "Adobe Photoshop" > /dev/null; then
    echo "[!] Photoshop is running. Please close it first."
    echo ""
    read -p "Press Enter after closing Photoshop..."
fi

echo "[*] Installing update..."

# Backup storage
if [ -e "$DEST_DIR/storage" ]; then
    cp "$DEST_DIR/storage" "$TEMP_STORAGE"
fi

# Extract ZIP
rm -rf "$EXTRACT_PATH"
mkdir -p "$EXTRACT_PATH"
unzip -o "$ZIP_PATH" -d "$EXTRACT_PATH"

# Find content folder - check if files are at root or in a subfolder
if [ -d "$EXTRACT_PATH/CSXS" ]; then
    SOURCE_PATH="$EXTRACT_PATH"
else
    CONTENT_FOLDER=$(find "$EXTRACT_PATH" -maxdepth 2 -type d -name "CSXS" | head -1 | xargs dirname 2>/dev/null)
    if [ -n "$CONTENT_FOLDER" ]; then
        SOURCE_PATH="$CONTENT_FOLDER"
    else
        SOURCE_PATH="$EXTRACT_PATH"
    fi
fi

# Clean and recreate target
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# Copy files
for folder in app CSXS icons locale; do
    if [ -d "$SOURCE_PATH/$folder" ]; then
        cp -r "$SOURCE_PATH/$folder" "$DEST_DIR/"
    fi
done

# Copy themes
if [ -d "$SOURCE_PATH/themes" ]; then
    mkdir -p "$DEST_DIR/app/themes"
    cp -r "$SOURCE_PATH/themes/"* "$DEST_DIR/app/themes/"
fi

# Restore storage
if [ -f "$TEMP_STORAGE" ]; then
    cp "$TEMP_STORAGE" "$DEST_DIR/storage"
fi

echo ""
echo "+------------------------------------------------------------------+"
echo "|                      Update Complete!                            |"
echo "+------------------------------------------------------------------+"
echo ""
echo "You can now open Photoshop and use TypeR."
echo ""
echo "This folder will be deleted automatically."
read -p "Press Enter to exit..."

# Cleanup - delete the entire TypeR_Update folder
cd "$HOME/Downloads"
rm -rf "$SCRIPT_DIR"
`;
          
          const shScriptPath = `${downloadsPath}/install_update.command`;
          window.cep.fs.writeFile(shScriptPath, installScript);
          
          // Make executable
          csInterface.evalScript(`makeExecutable("${shScriptPath}")`, () => {
            onProgress && onProgress(locale.updateReady || 'Update ready to install...');
            
            // Open the folder in Finder
            csInterface.evalScript(`openFolder("${downloadsPath}")`, () => {
              onComplete && onComplete(true); // true = needs manual step
            });
          });
        }
      })
      .catch(err => {
        console.error('Update failed:', err);
        onError && onError(err.message || 'Update failed');
      });
    });
    
  } catch (e) {
    console.error('Update failed:', e);
    onError && onError(e.message || 'Update failed');
  }
};

const readStorage = (key) => {
  const result = window.cep.fs.readFile(storagePath);
  if (result.err) {
    return key
      ? void 0
      : {
          error: result.err,
          data: {},
        };
  } else {
    let data;
    try {
      data = JSON.parse(result.data || "{}") || {};
    } catch (e) {
      data = {};
    }
    return key ? data[key] : { data };
  }
};

const writeToStorage = (data, rewrite) => {
  const storage = readStorage();
  if (storage.error || rewrite) {
    const result = window.cep.fs.writeFile(storagePath, JSON.stringify(data));
    return !result.err;
  } else {
    data = Object.assign({}, storage.data, data);
    const result = window.cep.fs.writeFile(storagePath, JSON.stringify(data));
    return !result.err;
  }
};

const deleteStorageFile = () => {
  const result = window.cep.fs.deleteFile(storagePath);
  if (typeof result === "number") {
    return (
      result === window.cep.fs.NO_ERROR ||
      result === window.cep.fs.ERR_NOT_FOUND
    );
  }
  if (typeof result === "object" && result) {
    return !result.err || result.err === window.cep.fs.ERR_NOT_FOUND;
  }
  return false;
};

const parseLocaleFile = (str) => {
  const result = {};
  if (!str) return result;
  const lines = str.replace(/\r/g, "").split("\n");
  let key = null;
  let val = "";
  for (let line of lines) {
    if (line.startsWith("#")) continue;
    if (key) {
      val += line;
      if (val.endsWith("\\")) {
        val = val.slice(0, -1) + "\n";
        continue;
      }
      result[key] = val;
      key = null;
      val = "";
      continue;
    }
    const i = line.indexOf("=");
    if (i === -1) continue;
    key = line.slice(0, i).trim();
    val = line.slice(i + 1);
    if (val.endsWith("\\")) {
      val = val.slice(0, -1) + "\n";
      continue;
    }
    result[key] = val;
    key = null;
    val = "";
  }
  return result;
};

const initLocale = () => {
  locale = csInterface.initResourceBundle();
  const loadLocaleFile = (file) => {
    const result = window.cep.fs.readFile(file);
    if (!result.err) {
      const data = parseLocaleFile(result.data);
      locale = Object.assign(locale, data);
    }
  };
  // Always merge default strings to ensure fallbacks for new keys
  loadLocaleFile(`${path}/locale/messages.properties`);
  const lang = readStorage("language");
  if (lang && lang !== "auto") {
    const file = lang === "en_US" ? `${path}/locale/messages.properties` : `${path}/locale/${lang}/messages.properties`;
    loadLocaleFile(file);
  }
};

initLocale();

const nativeAlert = (text, title, isError) => {
  const data = JSON.stringify({ text, title, isError });
  csInterface.evalScript("nativeAlert(" + data + ")");
};

const nativeConfirm = (text, title, callback) => {
  const data = JSON.stringify({ text, title });
  csInterface.evalScript("nativeConfirm(" + data + ")", (result) => callback(!!result));
};

let userFonts = null;
const getUserFonts = () => {
  return Array.isArray(userFonts) ? userFonts.concat([]) : [];
};
if (!userFonts) {
  csInterface.evalScript("getUserFonts()", (data) => {
    let dataObj;
    try {
      dataObj = JSON.parse(data || "{}");
    } catch (e) {
      dataObj = {};
    }
    const fonts = dataObj.fonts || [];
    userFonts = fonts;
  });
}

const getActiveLayerText = (callback) => {
  csInterface.evalScript("getActiveLayerText()", (data) => {
    let dataObj;
    try {
      dataObj = JSON.parse(data || "{}");
    } catch (e) {
      dataObj = {};
    }
    if (!data || !dataObj.textProps) nativeAlert(locale.errorNoTextLayer, locale.errorTitle, true);
    else callback(dataObj);
  });
};

const MARKDOWN_MARKERS = [
  { token: "***", bold: true, italic: true },
  { token: "___", bold: true, italic: true },
  { token: "**", bold: true, italic: false },
  { token: "__", bold: true, italic: false },
  { token: "*", bold: false, italic: true },
  { token: "_", bold: false, italic: true },
];

const isEscapedMarkdown = (text, index) => {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};

const findUnescapedToken = (text, token, start) => {
  let index = text.indexOf(token, start);
  while (index !== -1 && isEscapedMarkdown(text, index)) {
    index = text.indexOf(token, index + 1);
  }
  return index;
};

const findNextMarker = (text, start) => {
  let best = null;
  for (const marker of MARKDOWN_MARKERS) {
    const index = findUnescapedToken(text, marker.token, start);
    if (index === -1) continue;
    if (!best || index < best.index || (index === best.index && marker.token.length > best.marker.token.length)) {
      best = { index, marker };
    }
  }
  return best;
};

const unescapeMarkdownText = (text) => {
  return text.replace(/\\\\/g, "\\").replace(/\\\*/g, "*").replace(/\\_/g, "_");
};

const parseMarkdownRuns = (input) => {
  const text = typeof input === "string" ? input : "";
  const runs = [];
  const overlaySegments = [];

  const pushRun = (segment, style) => {
    if (!segment) return;
    const cleaned = unescapeMarkdownText(segment);
    if (!cleaned) return;
    const last = runs[runs.length - 1];
    if (last && last.bold === style.bold && last.italic === style.italic) {
      last.text += cleaned;
    } else {
      runs.push({ text: cleaned, bold: style.bold, italic: style.italic });
    }
  };

  const pushOverlaySegment = (segment, style, hidden, marker) => {
    if (!segment) return;
    const last = overlaySegments[overlaySegments.length - 1];
    if (
      last &&
      last.hidden === hidden &&
      last.marker === marker &&
      last.bold === style.bold &&
      last.italic === style.italic
    ) {
      last.text += segment;
    } else {
      overlaySegments.push({ text: segment, bold: style.bold, italic: style.italic, hidden, marker });
    }
  };

  const pushOverlayText = (segment, style) => {
    if (!segment) return;
    let buffer = "";
    for (let i = 0; i < segment.length; i++) {
      const char = segment[i];
      const next = segment[i + 1];
      const isEscaped = char === "\\" && (next === "\\" || next === "*" || next === "_");
      if (isEscaped) {
        if (buffer) {
          pushOverlaySegment(buffer, style, false);
          buffer = "";
        }
        // Keep the backslash width for caret alignment but hide it
        pushOverlaySegment("\\", style, true);
        // Render the escaped character visibly
        pushOverlaySegment(next === "\\" ? "\\" : next, style, false);
        i += 1;
        continue;
      }
      buffer += char;
    }
    if (buffer) {
      pushOverlaySegment(buffer, style, false);
    }
  };

  const walk = (segment, style) => {
    let cursor = 0;
    while (cursor < segment.length) {
      const match = findNextMarker(segment, cursor);
      if (!match) {
        const tail = segment.slice(cursor);
        pushRun(tail, style);
        pushOverlayText(tail, style);
        break;
      }
      if (match.index > cursor) {
        const before = segment.slice(cursor, match.index);
        pushRun(before, style);
        pushOverlayText(before, style);
      }
      const afterOpen = match.index + match.marker.token.length;
      const closeIndex = findUnescapedToken(segment, match.marker.token, afterOpen);
      if (closeIndex === -1) {
        const unmatched = segment.slice(match.index, afterOpen);
        pushRun(unmatched, style);
        pushOverlayText(unmatched, style);
        cursor = afterOpen;
        continue;
      }
      // Opening marker: keep width for alignment
      pushOverlaySegment(match.marker.token, style, true, "open");
      const inner = segment.slice(afterOpen, closeIndex);
      const nextStyle = {
        bold: style.bold || match.marker.bold,
        italic: style.italic || match.marker.italic,
      };
      walk(inner, nextStyle);
      // Closing marker: keep width for alignment
      pushOverlaySegment(match.marker.token, style, true, "close");
      cursor = closeIndex + match.marker.token.length;
    }
  };

  walk(text, { bold: false, italic: false });

  const plainText = runs.map((run) => run.text).join("");
  const hasFormatting = runs.some((run) => run.bold || run.italic);
  return { text: plainText, runs, hasFormatting, overlaySegments };
};

const isMarkdownEnabled = () => readStorage("interpretMarkdown") === true;

const buildRichTextPayload = (text, allowMarkdown = isMarkdownEnabled()) => {
  if (typeof text !== "string" || !allowMarkdown) {
    return { text, richTextRuns: null };
  }
  const parsed = parseMarkdownRuns(text);
  return {
    text: parsed.text,
    richTextRuns: parsed.hasFormatting ? parsed.runs : null,
  };
};

const escapeMarkdownText = (text) => {
  return text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/_/g, "\\_");
};

const applyMarkdownStyle = (text, bold, italic) => {
  if (!bold && !italic) return text;
  const marker = bold && italic ? "***" : bold ? "**" : "*";
  const parts = text.split("\n");
  return parts.map((part) => (part === "" ? part : `${marker}${part}${marker}`)).join("\n");
};

const convertHtmlToMarkdown = (html) => {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const runs = [];

  const pushRun = (text, style) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.bold === style.bold && last.italic === style.italic) {
      last.text += text;
    } else {
      runs.push({ text, bold: style.bold, italic: style.italic });
    }
  };

  const walk = (node, style) => {
    if (node.nodeType === 3) {
      const value = (node.nodeValue || "").replace(/\u00a0/g, " ");
      pushRun(value, style);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      pushRun("\n", style);
      return;
    }

    const nextStyle = { bold: style.bold, italic: style.italic };
    if (tag === "b" || tag === "strong") nextStyle.bold = true;
    if (tag === "i" || tag === "em") nextStyle.italic = true;

    const inlineStyle = node.getAttribute("style") || "";
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(inlineStyle)) nextStyle.bold = true;
    if (/font-weight\s*:\s*(normal|[1-5]00)/i.test(inlineStyle)) nextStyle.bold = false;
    if (/font-style\s*:\s*italic/i.test(inlineStyle)) nextStyle.italic = true;
    if (/font-style\s*:\s*normal/i.test(inlineStyle)) nextStyle.italic = false;

    const isBlock = /^(p|div|li|ul|ol|tr)$/i.test(tag);
    if (isBlock && runs.length && !runs[runs.length - 1].text.endsWith("\n")) {
      pushRun("\n", style);
    }
    for (const child of Array.from(node.childNodes)) {
      walk(child, nextStyle);
    }
    if (isBlock) {
      pushRun("\n", style);
    }
  };

  walk(doc.body, { bold: false, italic: false });

  let markdown = runs
    .map((run) => {
      const escaped = escapeMarkdownText(run.text);
      return applyMarkdownStyle(escaped, run.bold, run.italic);
    })
    .join("");

  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  return markdown;
};

const setActiveLayerText = (text, style, direction, callback = () => {}) => {
  // Support legacy calls where direction is omitted and callback is 3rd parameter
  if (typeof direction === "function") {
    callback = direction;
    direction = undefined;
  }
  if (!text && !style) {
    nativeAlert(locale.errorNoTextNoStyle, locale.errorTitle, true);
    callback(false);
    return false;
  }
  const parsed = buildRichTextPayload(text);
  const data = JSON.stringify({
    text: parsed.text,
    style,
    direction,
    richTextRuns: parsed.richTextRuns,
  });
  csInterface.evalScript("setActiveLayerText(" + data + ")", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error) nativeAlert(locale.errorNoTextLayer, locale.errorTitle, true);
    callback(!error, log);
  });
};

const getCurrentSelection = (callback = () => {}) => {
  csInterface.evalScript("getCurrentSelection()", (result) => {
    let data;
    try {
      data = JSON.parse(result || "{}");
    } catch (e) {
      data = {};
    }
    if (data.error) {
      callback(null);
    } else {
      callback(data);
    }
  });
};

const getSelectionBoundsHash = (selection) => {
  if (!selection) return null;
  return `${selection.xMid}_${selection.yMid}_${selection.width}_${selection.height}`;
};

const startSelectionMonitoring = () => {
  csInterface.evalScript("startSelectionMonitoring()");
};

const stopSelectionMonitoring = () => {
  csInterface.evalScript("stopSelectionMonitoring()");
};

const getSelectionChanged = (callback = () => {}) => {
  csInterface.evalScript("getSelectionChanged()", (result) => {
    let data;
    try {
      data = JSON.parse(result || "{}");
    } catch (e) {
      data = {};
    }
    if (data.noChange) {
      callback(null);
    } else if (data.error) {
      callback(null);
    } else {
      callback(data);
    }
  });
};

const createTextLayerInSelection = (text, style, pointText, padding, direction, options, callback = () => {}) => {
  // Support legacy calls where padding/direction are omitted and callback may be 4th or 5th parameter
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (!options || typeof options !== "object") options = {};
  if (typeof padding === "function") {
    callback = padding;
    padding = 0;
    direction = undefined;
  } else if (typeof direction === "function") {
    callback = direction;
    direction = undefined;
  }
  if (!text) {
    nativeAlert(locale.errorNoText, locale.errorTitle, true);
    callback(false);
    return false;
  }
  if (!style) {
    style = { textProps: getDefaultStyle(), stroke: getDefaultStroke() };
  }
  const parsed = buildRichTextPayload(text);
  const data = JSON.stringify({
    text: parsed.text,
    style,
    padding: padding || 0,
    direction,
    autoFit: !!options.autoFit,
    autoFitPadding: options.autoFitPadding || 13,
    useScaling: !!options.useScaling,
    scalingMin: options.scalingMin || 85,
    autoShape: !!options.autoShape,
    richTextRuns: parsed.richTextRuns,
  });
  csInterface.evalScript("createTextLayerInSelection(" + data + ", " + !!pointText + ")", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error === "smallSelection") nativeAlert(locale.errorSmallSelection, locale.errorTitle, true);
    else if (error) nativeAlert(locale.errorNoSelection, locale.errorTitle, true);
    callback(!error, log);
  });
};

const createTextLayersInStoredSelections = (texts, styles, selections, pointText, padding, direction, options, callback = () => {}) => {
  // Support legacy calls where padding/direction are omitted and callback may be 5th or 6th parameter
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (!options || typeof options !== "object") options = {};
  if (typeof padding === "function") {
    callback = padding;
    padding = 0;
    direction = undefined;
  } else if (typeof direction === "function") {
    callback = direction;
    direction = undefined;
  }
  if (!Array.isArray(texts) || texts.length === 0) {
    nativeAlert(locale.errorNoText, locale.errorTitle, true);
    callback(false);
    return false;
  }
  if (!Array.isArray(styles) || styles.length === 0) {
    styles = [{ textProps: getDefaultStyle(), stroke: getDefaultStroke() }];
  }
  if (!Array.isArray(selections) || selections.length === 0) {
    nativeAlert(locale.errorNoSelection, locale.errorTitle, true);
    callback(false);
    return false;
  }
  const parsedTexts = texts.map((line) => buildRichTextPayload(line));
  const data = JSON.stringify({
    texts: parsedTexts.map((entry) => entry.text),
    richTextRuns: parsedTexts.map((entry) => entry.richTextRuns),
    styles,
    selections,
    padding: padding || 0,
    direction,
    autoFit: !!options.autoFit,
    autoFitPadding: options.autoFitPadding || 13,
    useScaling: !!options.useScaling,
    scalingMin: options.scalingMin || 85,
    autoShape: !!options.autoShape,
  });
  csInterface.evalScript("createTextLayersInStoredSelections(" + data + ", " + !!pointText + ")", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error === "smallSelection") nativeAlert(locale.errorSmallSelection, locale.errorTitle, true);
    else if (error === "noSelection") nativeAlert(locale.errorNoSelection, locale.errorTitle, true);
    else if (error === "invalidSelection") nativeAlert(locale.errorNoSelection, locale.errorTitle, true);
    else if (error && error.indexOf("scriptError:") === 0) nativeAlert(error.replace("scriptError: ", ""), locale.errorTitle, true);
    else if (error) nativeAlert("Error: " + error, locale.errorTitle, true);
    callback(!error, log);
  });
};

const alignTextLayerToSelection = (resizeTextBox = false, padding = 0, callback = () => {}) => {
  const data = JSON.stringify({ resizeTextBox: !!resizeTextBox, padding: padding || 0 });
  csInterface.evalScript("alignTextLayerToSelection(" + data + ")", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error === "smallSelection") nativeAlert(locale.errorSmallSelection, locale.errorTitle, true);
    else if (error === "noSelection") nativeAlert(locale.errorNoSelection, locale.errorTitle, true);
    else if (error) nativeAlert(locale.errorNoTextLayer, locale.errorTitle, true);
    callback(!error, log);
  });
};

const changeActiveLayerTextSize = (val, callback = () => {}) => {
  csInterface.evalScript("changeActiveLayerTextSize(" + val + ")", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error) nativeAlert(locale.errorNoTextLayer, locale.errorTitle, true);
    callback(!error, log);
  });
};

const _extractLog = (rawResult) => {
  var parts = (rawResult || '').split('|||LOG|||');
  return { result: parts[0] || '', log: parts.length > 1 ? parts.slice(1).join('|||LOG|||') : '' };
};

const getDebugLog = (callback) => {
  csInterface.evalScript("getDebugLog()", (result) => {
    callback(result || '');
  });
};

const autoFitText = (padding, useScaling, scalingMin, autoShape, callback = () => {}) => {
  csInterface.evalScript("autoFitTextInSelection(" + (padding || 15) + ", " + !!useScaling + ", " + (scalingMin || 85) + ", " + !!autoShape + ")", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error === "smallSelection") nativeAlert(locale.errorSmallSelection, locale.errorTitle, true);
    else if (error === "layer") nativeAlert(locale.errorNoTextLayer, locale.errorTitle, true);
    else if (error) nativeAlert(locale.errorNoSelection, locale.errorTitle, true);
    callback(!error, log);
  });
};

const addInverseStroke = (callback = () => {}) => {
  csInterface.evalScript("addInverseStroke()", (rawResult) => {
    const { result: error, log } = _extractLog(rawResult);
    if (error === "layer") nativeAlert(locale.errorNoTextLayer, locale.errorTitle, true);
    else if (error === "doc") nativeAlert(locale.errorNoDocument || "No document open", locale.errorTitle, true);
    callback(!error, log);
  });
};

const getHotkeyPressed = (callback) => {
  csInterface.evalScript("getHotkeyPressed()", callback);
};

const resizeTextArea = () => {
  const textArea = document.querySelector(".text-area");
  const textLines = document.querySelector(".text-lines");
  if (textArea && textLines) {
    textArea.style.height = textLines.offsetHeight + "px";
  }
};

let _scrollVersion = 0;
const scrollToLine = (lineIndex, delay = 150) => {
  const version = ++_scrollVersion;
  setTimeout(() => {
    if (version !== _scrollVersion) return;
    const lines = document.querySelectorAll(".text-line");
    if (!lines.length) return;
    const peekIndex = Math.min(lineIndex + 2, lines.length - 1);
    if (lines[peekIndex]) lines[peekIndex].scrollIntoView({ block: "nearest", behavior: "auto" });
    requestAnimationFrame(() => {
      if (version !== _scrollVersion) return;
      if (lines[lineIndex]) lines[lineIndex].scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  }, delay);
};

const scrollToStyle = (styleId, delay = 100) => {
  setTimeout(() => {
    const style = document.getElementById(styleId);
    if (style) style.scrollIntoView();
  }, delay);
};

const rgbToHex = (rgb = {}) => {
  const componentToHex = (c = 0) => ("0" + Math.round(c).toString(16)).substr(-2).toUpperCase();
  const r = rgb.red != null ? rgb.red : rgb.r;
  const g = rgb.green != null ? rgb.green : rgb.g;
  const b = rgb.blue != null ? rgb.blue : rgb.b;
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const getStyleObject = (textStyle) => {
  const styleObj = {};
  if (textStyle.fontName) styleObj.fontFamily = textStyle.fontName;
  if (textStyle.fontPostScriptName) styleObj.fontFileFamily = textStyle.fontPostScriptName;
  if (textStyle.syntheticBold) styleObj.fontWeight = "bold";
  if (textStyle.syntheticItalic) styleObj.fontStyle = "italic";
  if (textStyle.fontCaps === "allCaps") styleObj.textTransform = "uppercase";
  if (textStyle.fontCaps === "smallCaps") styleObj.textTransform = "lowercase";
  if (textStyle.underline && textStyle.underline !== "underlineOff") styleObj.textDecoration = "underline";
  if (textStyle.strikethrough && textStyle.strikethrough !== "strikethroughOff") {
    if (styleObj.textDecoration) styleObj.textDecoration += " line-through";
    else styleObj.textDecoration = "line-through";
  }
  return styleObj;
};

const getDefaultStyle = () => {
  return {
    layerText: {
      textGridding: "none",
      orientation: "horizontal",
      antiAlias: "antiAliasStrong",
      textStyleRange: [
        {
          from: 0,
          to: 100,
          textStyle: {
            fontPostScriptName: "Tahoma",
            fontName: "Tahoma",
            fontStyleName: "Regular",
            fontScript: 0,
            fontTechnology: 1,
            fontAvailable: true,
            size: 14,
            impliedFontSize: 14,
            horizontalScale: 100,
            verticalScale: 100,
            autoLeading: true,
            tracking: 0,
            baselineShift: 0,
            impliedBaselineShift: 0,
            autoKern: "metricsKern",
            fontCaps: "normal",
            digitSet: "defaultDigits",
            diacXOffset: 0,
            markYDistFromBaseline: 100,
            otbaseline: "normal",
            ligature: false,
            altligature: false,
            connectionForms: false,
            contextualLigatures: false,
            baselineDirection: "withStream",
            color: { red: 0, green: 0, blue: 0 },
          },
        },
      ],
      paragraphStyleRange: [
        {
          from: 0,
          to: 100,
          paragraphStyle: {
            burasagari: "burasagariNone",
            singleWordJustification: "justifyAll",
            justificationMethodType: "justifMethodAutomatic",
            textEveryLineComposer: false,
            alignment: "center",
            hangingRoman: true,
            hyphenate: false,
          },
        },
      ],
    },
    typeUnit: "pixelsUnit",
  };
};

const getDefaultStroke = () => {
  return {
    enabled: false,
    size: 0,
    opacity: 100,
    position: "outer",
    color: { r: 255, g: 255, b: 255 },
  };
};

const openFile = (path, autoClose = false) => {
  const encodedPath = JSON.stringify(path);
  csInterface.evalScript(
    "openFile(" + encodedPath + ", " + (autoClose ? "true" : "false") + ")"
  );
};

const _safeRequire = (mod) => {
  if (typeof require === 'function') return require(mod);
  if (typeof cep_node !== 'undefined' && cep_node.require) return cep_node.require(mod);
  if (typeof process !== 'undefined' && process.mainModule && process.mainModule.require) return process.mainModule.require(mod);
  throw new Error("Node.js modules not available. Please update Photoshop or reinstall the extension.");
};
const _d = (s) => atob(s);
const _LAMA_MODEL_FILE_ID = _d("MXJRTFVxUk44eUFNbjl2bFlBUk9aNVk5Nmo3UndNYkRl");
const _DET_MODEL_URL = _d("aHR0cHM6Ly9maWxlcy5jYXRib3gubW9lL3dpNGdzNy5wdA==");
const _DET_MODEL_SHA256 = "10bc9f702698148e079fb4462a6b910fcd69753e04838b54087ef91d5633097b";
const _LAMA_DIR_NAME = "TypeR_lama";
const _LAMA_CONFIG_YAML = "run_title: b18_ffc075_batch8x15\ntraining_model:\n  kind: default\n  visualize_each_iters: 1000\n  concat_mask: true\n  store_discr_outputs_for_vis: true\nlosses:\n  l1:\n    weight_missing: 0\n    weight_known: 10\n  perceptual:\n    weight: 0\n  adversarial:\n    kind: r1\n    weight: 10\n    gp_coef: 0.001\n    mask_as_fake_target: true\n    allow_scale_mask: true\n  feature_matching:\n    weight: 100\n  resnet_pl:\n    weight: 30\n    weights_path: ${env:TORCH_HOME}\noptimizers:\n  generator:\n    kind: adam\n    lr: 0.001\n  discriminator:\n    kind: adam\n    lr: 0.0001\nvisualizer:\n  key_order:\n  - image\n  - predicted_image\n  - discr_output_fake\n  - discr_output_real\n  - inpainted\n  rescale_keys:\n  - discr_output_fake\n  - discr_output_real\n  kind: directory\n  outdir: /tmp/lama_samples\nlocation:\n  data_root_dir: /tmp/lama_data\n  out_root_dir: /tmp/lama_experiments\n  tb_dir: /tmp/lama_tb_logs\ndata:\n  batch_size: 15\n  val_batch_size: 2\n  num_workers: 3\n  train:\n    indir: ${location.data_root_dir}/train\n    out_size: 256\n    mask_gen_kwargs:\n      irregular_proba: 1\n      irregular_kwargs:\n        max_angle: 4\n        max_len: 200\n        max_width: 100\n        max_times: 5\n        min_times: 1\n      box_proba: 1\n      box_kwargs:\n        margin: 10\n        bbox_min_size: 30\n        bbox_max_size: 150\n        max_times: 3\n        min_times: 1\n      segm_proba: 0\n    transform_variant: distortions\n    dataloader_kwargs:\n      batch_size: ${data.batch_size}\n      shuffle: true\n      num_workers: ${data.num_workers}\n  val:\n    indir: ${location.data_root_dir}/val\n    img_suffix: .png\n    dataloader_kwargs:\n      batch_size: ${data.val_batch_size}\n      shuffle: false\n      num_workers: ${data.num_workers}\ngenerator:\n  kind: ffc_resnet\n  input_nc: 4\n  output_nc: 3\n  ngf: 64\n  n_downsampling: 3\n  n_blocks: 18\n  add_out_act: sigmoid\n  init_conv_kwargs:\n    ratio_gin: 0\n    ratio_gout: 0\n    enable_lfu: false\n  downsample_conv_kwargs:\n    ratio_gin: ${generator.init_conv_kwargs.ratio_gout}\n    ratio_gout: ${generator.downsample_conv_kwargs.ratio_gin}\n    enable_lfu: false\n  resnet_conv_kwargs:\n    ratio_gin: 0.75\n    ratio_gout: ${generator.resnet_conv_kwargs.ratio_gin}\n    enable_lfu: false\ndiscriminator:\n  kind: pix2pixhd_nlayer\n  input_nc: 3\n  ndf: 64\n  n_layers: 4\nevaluator:\n  kind: default\n  inpainted_key: inpainted\n  integral_kind: ssim_fid100_f1\n";
const _getLamaBasePath = () => {
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  let baseDir;
  if (process.platform === "win32") {
    baseDir = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  } else {
    baseDir = path.join(os.homedir(), "Library", "Application Support");
  }
  return path.join(baseDir, _LAMA_DIR_NAME);
};

const _findPython = () => {
  const childProcess = require("child_process");
  const candidates = process.platform === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];
  for (const cmd of candidates) {
    try {
      const ver = childProcess.execSync(cmd + " --version", { timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
      if (ver.indexOf("Python 3") >= 0) return cmd;
    } catch(e) {}
  }
  return null;
};

const _getLamaScriptPath = () => {
  const path = require("path");
  return path.join(_getLamaBasePath(), "lama_clean.py");
};

const _ensureLamaScript = () => {
  const fs = require("fs");
  const path = require("path");
  const scriptPath = _getLamaScriptPath();
  const extDir = csInterface.getSystemPath(window.SystemPath.EXTENSION);
  const bundledScript = path.join(extDir, "lama_clean.py");
  if (!fs.existsSync(bundledScript)) return fs.existsSync(scriptPath) ? scriptPath : null;
  const basePath = _getLamaBasePath();
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
  if (!fs.existsSync(scriptPath)) {
    fs.copyFileSync(bundledScript, scriptPath);
    return scriptPath;
  }
  try {
    const bundledMtime = fs.statSync(bundledScript).mtimeMs;
    const cachedMtime = fs.statSync(scriptPath).mtimeMs;
    if (bundledMtime > cachedMtime) {
      fs.copyFileSync(bundledScript, scriptPath);
    }
  } catch(e) {}
  return scriptPath;
};

const _ensurePipPackages = (pythonCmd, onStep, callback) => {
  const childProcess = require("child_process");
  const checkCmd = pythonCmd + ' -c "import torch; import PIL; import numpy; print(\'OK\')"';
  try {
    const out = childProcess.execSync(checkCmd, { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
    if (out === "OK") { callback(true); return; }
  } catch(e) {}

  onStep("Installing required packages (torch + pillow)... This may take a few minutes on first run.");
  const basePipArgs = " -m pip install --quiet torch --index-url https://download.pytorch.org/whl/cpu pillow numpy";
  const pipCmd = pythonCmd + basePipArgs;
  childProcess.exec(pipCmd, { timeout: 600000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      onStep("Global pip failed, trying --user install...");
      const pipCmdUser = pythonCmd + basePipArgs + " --user";
      childProcess.exec(pipCmdUser, { timeout: 600000, maxBuffer: 1024 * 1024 * 10 }, (error2, stdout2, stderr2) => {
        if (error2) {
          callback(false, "Failed to install packages: " + (error2.message || "").slice(0, 150));
          return;
        }
        try {
          const verify = childProcess.execSync(checkCmd, { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
          callback(verify === "OK", verify !== "OK" ? "Packages installed but verification failed" : null);
        } catch(ve) {
          callback(false, "Packages installed but verification failed: " + ve.message);
        }
      });
      return;
    }
    try {
      const verify = childProcess.execSync(checkCmd, { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
      callback(verify === "OK", verify !== "OK" ? "Packages installed but verification failed" : null);
    } catch(ve) {
      callback(false, "Packages installed but verification failed: " + ve.message);
    }
  });
};

const _ensureDetectionPackages = (pythonCmd, onStep, callback) => {
  const childProcess = require("child_process");
  const checkCmd = pythonCmd + ' -c "import ultralytics; import cv2; print(\'OK\')"';
  try {
    const out = childProcess.execSync(checkCmd, { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
    if (out === "OK") { callback(true); return; }
  } catch(e) {}

  onStep("Installing detection packages (ultralytics)... This may take a few minutes on first run.");
  const basePipArgs = " -m pip install --quiet ultralytics opencv-python-headless torchvision --extra-index-url https://download.pytorch.org/whl/cpu";
  const pipCmd = pythonCmd + basePipArgs;
  childProcess.exec(pipCmd, { timeout: 600000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      onStep("Global pip failed, trying --user install...");
      const pipCmdUser = pythonCmd + basePipArgs + " --user";
      childProcess.exec(pipCmdUser, { timeout: 600000, maxBuffer: 1024 * 1024 * 10 }, (error2) => {
        if (error2) {
          callback(false, "Failed to install detection packages: " + (error2.message || "").slice(0, 150));
          return;
        }
        try {
          const verify = childProcess.execSync(checkCmd, { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
          callback(verify === "OK", verify !== "OK" ? "Detection packages installed but verification failed" : null);
        } catch(ve) {
          callback(false, "Detection packages installed but verification failed: " + ve.message);
        }
      });
      return;
    }
    try {
      const verify = childProcess.execSync(checkCmd, { timeout: 15000, stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
      callback(verify === "OK", verify !== "OK" ? "Detection packages installed but verification failed" : null);
    } catch(ve) {
      callback(false, "Detection packages installed but verification failed: " + ve.message);
    }
  });
};

const _getLamaModelDir = () => {
  const path = require("path");
  return path.join(_getLamaBasePath(), "lama-big");
};

const _getDetectionModelPath = () => {
  const path = require("path");
  const fs = require("fs");
  const detDir = path.join(_getLamaBasePath(), "detection");
  if (fs.existsSync(path.join(detDir, "public.pt"))) return path.join(detDir, "public.pt");
  if (fs.existsSync(path.join(detDir, "best.pt"))) return path.join(detDir, "best.pt");
  const files = fs.existsSync(detDir) ? fs.readdirSync(detDir) : [];
  for (const f of files) {
    if (f.endsWith(".pt")) return path.join(detDir, f);
  }
  return null;
};

const checkDetectionModel = () => {
  try {
    return !!_getDetectionModelPath();
  } catch (e) {
    return false;
  }
};

const checkLamaModel = () => {
  try {
    const fs = require("fs");
    const path = require("path");
    const modelDir = _getLamaModelDir();
    const modelFile = path.join(modelDir, "big-lama.pt");
    return fs.existsSync(modelFile);
  } catch (e) {
    console.log("[LAMA] checkLamaModel error:", e.message);
    return false;
  }
};

const downloadLamaModel = (onProgress, onComplete, onError) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const https = require("https");

    const basePath = _getLamaBasePath();
    const modelDir = _getLamaModelDir();
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    const modelFilePath = path.join(modelDir, "big-lama.pt");
    const downloadUrl = _d("aHR0cHM6Ly9kcml2ZS51c2VyY29udGVudC5nb29nbGUuY29tL2Rvd25sb2FkP2lkPQ==") + _LAMA_MODEL_FILE_ID + _d("JmV4cG9ydD1kb3dubG9hZCZjb25maXJtPXQ=");

    const _followAndSave = (url, redirectCount) => {
      if (redirectCount > 10) {
        onError("Too many redirects during download");
        return;
      }
      const httpMod = url.startsWith("https") ? https : require("http");
      httpMod.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          _followAndSave(res.headers.location, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) {
          onError("Download failed: HTTP " + res.statusCode);
          return;
        }

        const totalSize = parseInt(res.headers["content-length"] || "0", 10);
        let downloadedSize = 0;
        const fileStream = fs.createWriteStream(modelFilePath);

        res.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            onProgress(Math.round((downloadedSize / totalSize) * 100));
          } else {
            onProgress(Math.min(95, Math.round(downloadedSize / 1024 / 1024 / 4)));
          }
        });

        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          const stat = fs.statSync(modelFilePath);
          if (stat.size < 100 * 1024 * 1024) {
            try { fs.unlinkSync(modelFilePath); } catch(e) {}
            onError("Downloaded file too small (" + Math.round(stat.size / 1024 / 1024) + " MB) — model may not have downloaded correctly");
            return;
          }
          try {
            const configPath = path.join(modelDir, "config.yaml");
            fs.writeFileSync(configPath, _LAMA_CONFIG_YAML, "utf8");
          } catch(ce) { console.log("[LAMA] config write warning:", ce.message); }
          onProgress(100);
          onComplete();
        });

        fileStream.on("error", (err) => {
          try { fs.unlinkSync(modelFilePath); } catch(e) {}
          onError("Write failed: " + err.message);
        });
      }).on("error", (err) => {
        onError("Download failed: " + err.message);
      });
    };

    _followAndSave(downloadUrl, 0);
  } catch (e) {
    onError("Download setup failed: " + e.message);
  }
};

const downloadDetectionModel = (onProgress, onComplete, onError) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const https = require("https");

    const detDir = path.join(_getLamaBasePath(), "detection");
    if (!fs.existsSync(detDir)) {
      fs.mkdirSync(detDir, { recursive: true });
    }

    const modelFilePath = path.join(detDir, "public.pt");
    const downloadUrl = _DET_MODEL_URL;

    const _followAndSave = (url, redirectCount) => {
      if (redirectCount > 10) {
        onError("Too many redirects during download");
        return;
      }
      const httpMod = url.startsWith("https") ? https : require("http");
      httpMod.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          _followAndSave(res.headers.location, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) {
          onError("Download failed: HTTP " + res.statusCode);
          return;
        }

        const totalSize = parseInt(res.headers["content-length"] || "0", 10);
        let downloadedSize = 0;
        const fileStream = fs.createWriteStream(modelFilePath);

        res.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            onProgress(Math.round((downloadedSize / totalSize) * 100));
          } else {
            onProgress(Math.min(95, Math.round(downloadedSize / 1024 / 1024)));
          }
        });

        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          const stat = fs.statSync(modelFilePath);
          if (stat.size < 5 * 1024 * 1024) {
            try { fs.unlinkSync(modelFilePath); } catch(e) {}
            onError("Downloaded file too small (" + Math.round(stat.size / 1024 / 1024) + " MB) — model may not have downloaded correctly");
            return;
          }
          try {
            const crypto = require("crypto");
            const hash = crypto.createHash("sha256").update(fs.readFileSync(modelFilePath)).digest("hex");
            if (hash !== _DET_MODEL_SHA256) {
              try { fs.unlinkSync(modelFilePath); } catch(e) {}
              onError("Integrity check failed — downloaded file hash mismatch. Please try again.");
              return;
            }
          } catch(he) {
            console.log("[DET] SHA-256 check skipped:", he.message);
          }
          onProgress(100);
          onComplete();
        });

        fileStream.on("error", (err) => {
          try { fs.unlinkSync(modelFilePath); } catch(e) {}
          onError("Write failed: " + err.message);
        });
      }).on("error", (err) => {
        onError("Download failed: " + err.message);
      });
    };

    _followAndSave(downloadUrl, 0);
  } catch (e) {
    onError("Download setup failed: " + e.message);
  }
};

const lamaCleanSelection = (onResult, onError, onStep) => {
  const _step = (msg) => { try { if (onStep) onStep(msg); console.log("[LAMA_CLEAN] " + msg); } catch(e) {} };

  if (!checkLamaModel()) {
    onError("modelNotReady");
    return;
  }

  _step("Checking Python...");
  const pythonCmd = _findPython();
  if (!pythonCmd) {
    onError("pythonNotFound", 0, "Python 3 not found. Please install Python 3.8+ from python.org");
    return;
  }
  _step("Found Python: " + pythonCmd);

  const scriptPath = _ensureLamaScript();
  if (!scriptPath) {
    onError("scriptNotFound", 0, "LaMa inference script not found");
    return;
  }

  const cepFs = window.cep && window.cep.fs;
  if (!cepFs) {
    onError("noCepFs", 0, "File system not available");
    return;
  }
  const modelDir = _getLamaModelDir();

  const _runInference = () => {
    _step("Capturing selection with context...");
    csInterface.evalScript("getSelectionForLamaClean(0)", (rawResult) => {
      const { result, log } = _extractLog(rawResult);
      if (!result || result.startsWith("error:")) {
        const errType = result ? result.replace("error:", "") : "unknown";
        onError(errType, 0, log);
        return;
      }

      let selData;
      try {
        selData = JSON.parse(result);
      } catch (e) {
        onError("parseError", 0, log);
        return;
      }

      _step("Captured " + selData.selWidth + "x" + selData.selHeight + " px (context: " + selData.cropWidth + "x" + selData.cropHeight + ")");

      const path = require("path");
      const tmpDir = csInterface.getSystemPath(window.SystemPath.TEMP_DIR) || csInterface.getSystemPath(window.SystemPath.USER_DATA);
      const sep = path.sep;
      const outputPath = tmpDir + sep + "typer_lama_output.png";

      const cmdArgs = [
        scriptPath,
        "clean",
        "--model-dir", modelDir,
        "--input", selData.inputPath,
        "--mask", selData.maskPath,
        "--output", outputPath
      ];

      _step("Running LaMa inpainting...");

      try {
        const childProcess = require("child_process");
        childProcess.execFile(pythonCmd, cmdArgs, { timeout: 300000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
          try { cepFs.deleteFileOrDirectory(selData.inputPath); } catch(df) {}
          try { cepFs.deleteFileOrDirectory(selData.maskPath); } catch(df) {}

          if (error) {
            _step("LaMa process error: " + (error.message || "Unknown"));
            if (stderr) _step("stderr: " + stderr.substring(0, 500));
            if ((error.message || "").indexOf("No module named") >= 0 || (stderr || "").indexOf("No module named") >= 0) {
              onError("missingPackages", 0, "Required Python packages not installed. Click LaMa Clean again to auto-install.");
              return;
            }
            onError("processError", 0, error.message || "LaMa process failed");
            return;
          }

          const out = (stdout || "").trim();
          _step("LaMa output: " + out);

          if (!out.startsWith("OK:")) {
            onError("processError", 0, out || stderr || "No output from LaMa");
            return;
          }

          const resultFilePath = out.replace("OK:", "").trim();
          const fileStat = cepFs.stat(resultFilePath);
          if (fileStat.err !== 0) {
            onError("outputNotFound", 0, "LaMa output file not found: " + resultFilePath);
            return;
          }

          _step("Applying result to document...");
          const applyArgs = [
            JSON.stringify(resultFilePath),
            selData.cropLeft,
            selData.cropTop,
            selData.maskOffsetLeft,
            selData.maskOffsetTop,
            selData.selWidth,
            selData.selHeight
          ].join(", ");
          csInterface.evalScript("applyLamaCleanResult(" + applyArgs + ")", (applyRaw) => {
            const { result: applyResult, log: applyLog } = _extractLog(applyRaw);
            if (applyResult === "ok") {
              _step("Applied successfully");
              onResult(true, applyLog);
            } else {
              onError("applyError", 0, "Failed to place result: " + (applyResult || ""));
            }
          });
        });
      } catch (spawnErr) {
        onError("spawnError", 0, spawnErr.message || "Failed to start LaMa process");
      }
    });
  };

  _ensurePipPackages(pythonCmd, _step, (success, errMsg) => {
    if (!success) {
      onError("pipError", 0, errMsg || "Failed to install required Python packages");
      return;
    }
    _runInference();
  });
};

const lamaAutoClean = (onResult, onError, onStep) => {
  const _step = (msg) => { try { if (onStep) onStep(msg); console.log("[AUTO_CLEAN] " + msg); } catch(e) {} };

  if (!checkLamaModel()) {
    onError("modelNotReady");
    return;
  }

  const detModelPath = _getDetectionModelPath();
  if (!detModelPath) {
    onError("detectionModelNotFound", 0, "Detection model not found. Place public.pt in TypeR_lama/detection/ folder.");
    return;
  }

  _step("Checking Python...");
  const pythonCmd = _findPython();
  if (!pythonCmd) {
    onError("pythonNotFound", 0, "Python 3 not found");
    return;
  }

  const scriptPath = _ensureLamaScript();
  if (!scriptPath) {
    onError("scriptNotFound", 0, "LaMa script not found");
    return;
  }

  const modelDir = _getLamaModelDir();
  const cepFs = window.cep && window.cep.fs;

  const _runAutoClean = () => {
    _step("Exporting document for detection...");
    csInterface.evalScript("exportDocumentForDetection()", (rawResult) => {
      const { result, log } = _extractLog(rawResult);
      if (!result || result.startsWith("error:")) {
        onError(result ? result.replace("error:", "") : "unknown", 0, log);
        return;
      }

      let docData;
      try { docData = JSON.parse(result); } catch(e) { onError("parseError", 0, "Failed to parse document data"); return; }

      _step("Running text detection...");
      const childProcess = require("child_process");
      const detArgs = [scriptPath, "detect", "--det-model", detModelPath, "--input", docData.filePath];
      childProcess.execFile(pythonCmd, detArgs, { timeout: 120000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        try { if (cepFs) cepFs.deleteFileOrDirectory(docData.filePath); } catch(df) {}

        if (error) {
          if ((error.message || "").indexOf("ultralytics") >= 0 || (stderr || "").indexOf("ultralytics") >= 0) {
            onError("missingDetPackages", 0, "Detection packages not installed");
            return;
          }
          onError("detectionError", 0, error.message || "Detection failed");
          return;
        }

        let detections;
        try { detections = JSON.parse((stdout || "").trim()); } catch(e) {
          onError("detectionParseError", 0, "Failed to parse detection output: " + (stdout || "").slice(0, 100));
          return;
        }

        if (!detections || detections.length === 0) {
          _step("No text regions detected.");
          onResult(true, "No text regions found in the document.");
          return;
        }

        const docW = docData.width;
        const docH = docData.height;
        detections.forEach(d => {
          d.x1 = Math.max(0, Math.min(d.x1, docW));
          d.y1 = Math.max(0, Math.min(d.y1, docH));
          d.x2 = Math.max(d.x1 + 1, Math.min(d.x2, docW));
          d.y2 = Math.max(d.y1 + 1, Math.min(d.y2, docH));
        });
        const validDetections = detections.filter(d => (d.x2 - d.x1) >= 5 && (d.y2 - d.y1) >= 5);

        _step("Found " + validDetections.length + " text region(s). Starting cleanup...");

        let currentIdx = 0;
        let appliedCount = 0;
        let skippedCount = 0;
        const cleanNext = () => {
          if (currentIdx >= validDetections.length) {
            _step("Done! Applied: " + appliedCount + ", Skipped: " + skippedCount + " of " + validDetections.length + " regions.");
            onResult(true, "Cleaned " + appliedCount + "/" + validDetections.length + " text regions." + (skippedCount > 0 ? " (" + skippedCount + " skipped)" : ""));
            return;
          }

          const det = validDetections[currentIdx];
          const regionNum = currentIdx + 1;
          _step("Cleaning region " + regionNum + "/" + validDetections.length + " (" + det.class + " " + Math.round(det.confidence * 100) + "%)...");

          csInterface.evalScript("createSelectionFromBounds(" + det.x1 + "," + det.y1 + "," + det.x2 + "," + det.y2 + ")", (selRaw) => {
            const { result: selResult } = _extractLog(selRaw);
            if (selResult !== "ok") {
              _step("Warning: Failed to create selection for region " + regionNum + ", skipping.");
              skippedCount++;
              currentIdx++;
              cleanNext();
              return;
            }

            csInterface.evalScript("getSelectionForLamaClean(0)", (rawResult2) => {
              const { result: result2, log: log2 } = _extractLog(rawResult2);
              if (!result2 || result2.startsWith("error:")) {
                _step("Warning: Failed to capture region " + regionNum + ", skipping.");
                skippedCount++;
                currentIdx++;
                cleanNext();
                return;
              }

              let selData;
              try { selData = JSON.parse(result2); } catch(e) {
                skippedCount++;
                currentIdx++;
                cleanNext();
                return;
              }

              const path = require("path");
              const tmpDir = csInterface.getSystemPath(window.SystemPath.TEMP_DIR) || csInterface.getSystemPath(window.SystemPath.USER_DATA);
              const outputPath = tmpDir + path.sep + "typer_lama_auto_output_" + currentIdx + ".png";

              const cmdArgs = [scriptPath, "clean", "--model-dir", modelDir, "--input", selData.inputPath, "--mask", selData.maskPath, "--output", outputPath];

              childProcess.execFile(pythonCmd, cmdArgs, { timeout: 300000, maxBuffer: 1024 * 1024 * 10 }, (error2, stdout2, stderr2) => {
                try { if (cepFs) cepFs.deleteFileOrDirectory(selData.inputPath); } catch(df) {}
                try { if (cepFs) cepFs.deleteFileOrDirectory(selData.maskPath); } catch(df) {}

                if (error2) {
                  _step("Warning: LaMa failed for region " + regionNum + ", skipping.");
                  skippedCount++;
                  currentIdx++;
                  cleanNext();
                  return;
                }

                const out = (stdout2 || "").trim();
                if (!out.startsWith("OK:")) {
                  _step("Warning: Unexpected LaMa output for region " + regionNum + ", skipping.");
                  skippedCount++;
                  currentIdx++;
                  cleanNext();
                  return;
                }

                const resultFilePath = out.replace("OK:", "").trim();
                const applyArgs = [
                  JSON.stringify(resultFilePath),
                  selData.cropLeft,
                  selData.cropTop,
                  selData.maskOffsetLeft,
                  selData.maskOffsetTop,
                  selData.selWidth,
                  selData.selHeight
                ].join(", ");

                csInterface.evalScript("applyLamaCleanResult(" + applyArgs + ")", (applyRaw) => {
                  const { result: applyResult } = _extractLog(applyRaw);
                  if (applyResult === "ok") {
                    appliedCount++;
                    _step("Region " + regionNum + "/" + validDetections.length + " cleaned.");
                  } else {
                    skippedCount++;
                    _step("Warning: Failed to apply result for region " + regionNum + ".");
                  }
                  currentIdx++;
                  cleanNext();
                });
              });
            });
          });
        };

        cleanNext();
      });
    });
  };

  _ensurePipPackages(pythonCmd, _step, (success, errMsg) => {
    if (!success) {
      onError("pipError", 0, errMsg);
      return;
    }
    _ensureDetectionPackages(pythonCmd, _step, (success2, errMsg2) => {
      if (!success2) {
        onError("pipError", 0, errMsg2);
        return;
      }
      _runAutoClean();
    });
  });
};

export { csInterface, locale, openUrl, readStorage, writeToStorage, deleteStorageFile, nativeAlert, nativeConfirm, getUserFonts, getActiveLayerText, setActiveLayerText, getCurrentSelection, getSelectionBoundsHash, startSelectionMonitoring, stopSelectionMonitoring, getSelectionChanged, createTextLayerInSelection, createTextLayersInStoredSelections, alignTextLayerToSelection, changeActiveLayerTextSize, autoFitText, getDebugLog, addInverseStroke, getHotkeyPressed, resizeTextArea, scrollToLine, scrollToStyle, rgbToHex, getStyleObject, getDefaultStyle, getDefaultStroke, openFile, checkUpdate, downloadAndInstallUpdate, convertHtmlToMarkdown, parseMarkdownRuns, lamaCleanSelection, checkLamaModel, downloadLamaModel, downloadDetectionModel, lamaAutoClean, checkDetectionModel };
