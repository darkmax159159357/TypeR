import './CSInterface';

import LightTheme from './topcoat/css/topcoat-desktop-light.min.css';
import DarkTheme from './topcoat/css/topcoat-desktop-dark.min.css';

var _dashboardMode = false;
var _lastSkinInfo = null;

function computeValue(value, delta) {
    var computedValue = !isNaN(delta) ? value + delta : value;
    if (computedValue < 0) {
        computedValue = 0;
    } else if (computedValue > 255) {
        computedValue = 255;
    }
    computedValue = Math.floor(computedValue);
    computedValue = computedValue.toString(16);
    return computedValue.length === 1 ? "0" + computedValue : computedValue;
}

function toHex(color, delta) {
    var hex = "";
    if (color) {
        hex = computeValue(color.red, delta) + computeValue(color.green, delta) + computeValue(color.blue, delta);
    }
    return hex;
}

function clearRules(stylesheetId) {
    var stylesheet = document.getElementById(stylesheetId);
    if (stylesheet && stylesheet.sheet) {
        while (stylesheet.sheet.cssRules.length > 0) {
            stylesheet.sheet.deleteRule(0);
        }
    }
}

function addRule(stylesheetId, selector, rule) {
    var stylesheet = document.getElementById(stylesheetId);
    if (stylesheet) {
        stylesheet = stylesheet.sheet;
        if (stylesheet.addRule) {
            stylesheet.addRule(selector, rule);
        } else if (stylesheet.insertRule) {
            stylesheet.insertRule(selector + ' { ' + rule + ' }', stylesheet.cssRules.length);
        }
    }
}

function applyClassicDark(styleId, appSkinInfo) {
    var lightBgdColor = toHex(appSkinInfo.panelBackgroundColor.color, 20);
    var darkBgdColor = toHex(appSkinInfo.panelBackgroundColor.color, -20);
    var bgdColor = toHex(appSkinInfo.panelBackgroundColor.color);

    addRule(styleId, ".hostElt", "background-color: #" + bgdColor);
    addRule(styleId, ".hostElt", "font-size: " + appSkinInfo.baseFontSize + "px;");
    addRule(styleId, ".hostElt", "font-family: " + appSkinInfo.baseFontFamily);
    addRule(styleId, ".hostElt", "color: #E4E6EA");

    addRule(styleId, ".hostBgd", "background-color: #" + bgdColor);
    addRule(styleId, ".hostBgdDark", "background-color: #" + darkBgdColor);
    addRule(styleId, ".hostBgdLight", "background-color: #" + lightBgdColor);

    addRule(styleId, ".hostBrd", "border: 1px solid #" + bgdColor);
    addRule(styleId, ".hostBrdDark", "border: 1px solid #" + darkBgdColor);
    addRule(styleId, ".hostBrdLight", "border: 1px solid #" + lightBgdColor);
    addRule(styleId, ".hostBrdContrast", "border: 1px solid rgba(255, 255, 255, 0.1)");
    addRule(styleId, ".hostBrdTop", "border-top: 1px solid #" + bgdColor);
    addRule(styleId, ".hostBrdTopDark", "border-top: 1px solid #" + darkBgdColor);
    addRule(styleId, ".hostBrdTopLight", "border-top: 1px solid #" + lightBgdColor);
    addRule(styleId, ".hostBrdTopContrast", "border-top: 1px solid rgba(255, 255, 255, 0.1)");
    addRule(styleId, ".hostBrdBot", "border-bottom: 1px solid #" + bgdColor);
    addRule(styleId, ".hostBrdBotDark", "border-bottom: 1px solid #" + darkBgdColor);
    addRule(styleId, ".hostBrdBotLight", "border-bottom: 1px solid #" + lightBgdColor);
    addRule(styleId, ".hostBrdBotContrast", "border-bottom: 1px solid rgba(255, 255, 255, 0.1)");

    addRule(styleId, ".hostButton", "background-color: #" + darkBgdColor);
    addRule(styleId, ".hostButton:hover", "background-color: #" + bgdColor);
    addRule(styleId, ".hostButton:active", "background-color: #" + darkBgdColor);
    addRule(styleId, ".hostButton", "border-color: #" + lightBgdColor);
}

function applyDashboardDark(styleId, appSkinInfo) {
    addRule(styleId, "body", "background-color: var(--bg-panel, #2B2F33) !important");

    addRule(styleId, ".hostElt", "background-color: var(--bg-panel, #2B2F33) !important");
    addRule(styleId, ".hostElt", "font-size: " + appSkinInfo.baseFontSize + "px;");
    addRule(styleId, ".hostElt", "font-family: " + appSkinInfo.baseFontFamily);
    addRule(styleId, ".hostElt", "color: var(--text-primary, #E4E6EA) !important");

    addRule(styleId, ".hostBgd", "background-color: var(--bg-panel, #2B2F33) !important");
    addRule(styleId, ".hostBgdDark", "background-color: var(--bg-input, #1A1D21) !important");
    addRule(styleId, ".hostBgdLight", "background-color: var(--bg-card, #25282C) !important");

    addRule(styleId, ".hostBrd", "border: 1px solid var(--border-color, #3A3F44) !important");
    addRule(styleId, ".hostBrdDark", "border: 1px solid var(--border-dark, #32363B) !important");
    addRule(styleId, ".hostBrdLight", "border: 1px solid var(--border-light, #44494E) !important");
    addRule(styleId, ".hostBrdContrast", "border: 1px solid var(--border-color, #3A3F44) !important");
    addRule(styleId, ".hostBrdTop", "border-top: 1px solid var(--border-color, #3A3F44) !important");
    addRule(styleId, ".hostBrdTopDark", "border-top: 1px solid var(--border-dark, #32363B) !important");
    addRule(styleId, ".hostBrdTopLight", "border-top: 1px solid var(--border-light, #44494E) !important");
    addRule(styleId, ".hostBrdTopContrast", "border-top: 1px solid var(--border-color, #3A3F44) !important");
    addRule(styleId, ".hostBrdBot", "border-bottom: 1px solid var(--border-color, #3A3F44) !important");
    addRule(styleId, ".hostBrdBotDark", "border-bottom: 1px solid var(--border-dark, #32363B) !important");
    addRule(styleId, ".hostBrdBotLight", "border-bottom: 1px solid var(--border-light, #44494E) !important");
    addRule(styleId, ".hostBrdBotContrast", "border-bottom: 1px solid var(--border-color, #3A3F44) !important");

    addRule(styleId, ".hostButton", "background-color: var(--bg-card, #25282C) !important");
    addRule(styleId, ".hostButton", "border-color: var(--border-color, #3A3F44) !important");
    addRule(styleId, ".hostButton", "color: var(--text-primary, #E4E6EA) !important");
    addRule(styleId, ".hostButton:hover", "background-color: var(--bg-elevated, #32363B) !important");
    addRule(styleId, ".hostButton:hover", "border-color: var(--accent-glow-sm, rgba(0, 180, 216, 0.35)) !important");
    addRule(styleId, ".hostButton:hover", "box-shadow: 0 0 8px var(--accent-glow-sm, rgba(0, 180, 216, 0.1))");
    addRule(styleId, ".hostButton:active", "background-color: var(--bg-input, #1A1D21) !important");

    addRule(styleId, ".topcoat-textarea", "background-color: var(--bg-input, #1A1D21) !important");
    addRule(styleId, ".topcoat-textarea", "color: var(--text-primary, #E4E6EA) !important");
    addRule(styleId, ".topcoat-textarea", "border-color: var(--border-color, #3A3F44) !important");
    addRule(styleId, "input", "background-color: var(--bg-input, #1A1D21) !important");
    addRule(styleId, "input", "color: var(--text-primary, #E4E6EA) !important");
    addRule(styleId, "input", "border-color: var(--border-color, #3A3F44) !important");
    addRule(styleId, "select", "background-color: var(--bg-input, #1A1D21) !important");
    addRule(styleId, "select", "color: var(--text-primary, #E4E6EA) !important");
    addRule(styleId, "select", "border-color: var(--border-color, #3A3F44) !important");
    addRule(styleId, "select option", "background-color: var(--bg-input, #1A1D21) !important; color: var(--text-primary, #E4E6EA) !important");
    addRule(styleId, "select option:checked", "background-color: var(--accent-glow-sm, rgba(0, 180, 216, 0.2)) !important; color: var(--accent, #00B4D8) !important");
    addRule(styleId, "input:focus", "border-color: var(--accent, #00B4D8) !important; box-shadow: 0 0 0 2px var(--accent-glow-sm, rgba(0, 180, 216, 0.15)) !important");
    addRule(styleId, "select:focus", "border-color: var(--accent, #00B4D8) !important; box-shadow: 0 0 0 2px var(--accent-glow-sm, rgba(0, 180, 216, 0.15)) !important");
    addRule(styleId, ".topcoat-textarea:focus", "border-color: var(--accent, #00B4D8) !important; box-shadow: 0 0 0 2px var(--accent-glow-sm, rgba(0, 180, 216, 0.15)) !important");

    addRule(styleId, "::-webkit-scrollbar", "width: 6px; height: 6px");
    addRule(styleId, "::-webkit-scrollbar-track", "background: var(--bg-input, #1A1D21)");
    addRule(styleId, "::-webkit-scrollbar-thumb", "background: var(--border-color, #3A3F44); border-radius: 3px");
    addRule(styleId, "::-webkit-scrollbar-thumb:hover", "background: var(--border-light, #4A4D55)");

    addRule(styleId, ".topcoat-button--large--cta", "background-color: var(--accent, #00B4D8) !important");
    addRule(styleId, ".topcoat-button--large--cta", "color: #fff !important");
    addRule(styleId, ".topcoat-button--large--cta", "border-color: var(--accent-deep, #0096C7) !important");
    addRule(styleId, ".topcoat-button--large--cta:hover", "background-color: var(--accent-hover, #48CAE4) !important");
    addRule(styleId, ".topcoat-button--large--cta:hover", "border-color: var(--accent, #00B4D8) !important");
    addRule(styleId, ".topcoat-button--large--cta:hover", "box-shadow: 0 0 12px var(--accent-glow, rgba(0, 180, 216, 0.3))");
    addRule(styleId, ".topcoat-button--large--cta:active", "background-color: var(--accent-deep, #0096C7) !important");
    addRule(styleId, ".topcoat-button--large--cta.m-danger", "background-color: var(--danger, #E74A3B) !important");
    addRule(styleId, ".topcoat-button--large--cta.m-danger", "border-color: #C71C16 !important");
    addRule(styleId, ".topcoat-button--large--cta.m-danger:hover", "background-color: #EF5350 !important");
    addRule(styleId, ".topcoat-button--large--cta.m-danger:hover", "box-shadow: 0 0 12px rgba(231, 74, 59, 0.3)");
}

function updateThemeWithAppSkinInfo(appSkinInfo) {
    _lastSkinInfo = appSkinInfo;
    
    var panelBgColor = appSkinInfo.panelBackgroundColor.color;
    var isLight = panelBgColor.red >= 125;
    var styleId = "hostStyle";

    clearRules(styleId);

    if (isLight) {
        var lightBgdColor = toHex(panelBgColor, 20);
        var darkBgdColor = toHex(panelBgColor, -20);
        var bgdColor = toHex(panelBgColor);

        addRule(styleId, ".hostElt", "background-color: #" + bgdColor);
        addRule(styleId, ".hostElt", "font-size: " + appSkinInfo.baseFontSize + "px;");
        addRule(styleId, ".hostElt", "font-family: " + appSkinInfo.baseFontFamily);
        addRule(styleId, ".hostElt", "color: #000000");
        
        addRule(styleId, ".hostBgd", "background-color: #" + bgdColor);
        addRule(styleId, ".hostBgdDark", "background-color: #" + darkBgdColor);
        addRule(styleId, ".hostBgdLight", "background-color: #" + lightBgdColor);

        addRule(styleId, ".hostBrd", "border: 1px solid #" + bgdColor);
        addRule(styleId, ".hostBrdDark", "border: 1px solid #" + darkBgdColor);
        addRule(styleId, ".hostBrdLight", "border: 1px solid #" + lightBgdColor);
        addRule(styleId, ".hostBrdContrast", "border: 1px solid rgba(0, 0, 0, 0.2)");
        addRule(styleId, ".hostBrdTop", "border-top: 1px solid #" + bgdColor);
        addRule(styleId, ".hostBrdTopDark", "border-top: 1px solid #" + darkBgdColor);
        addRule(styleId, ".hostBrdTopLight", "border-top: 1px solid #" + lightBgdColor);
        addRule(styleId, ".hostBrdTopContrast", "border-top: 1px solid rgba(0, 0, 0, 0.2)");
        addRule(styleId, ".hostBrdBot", "border-bottom: 1px solid #" + bgdColor);
        addRule(styleId, ".hostBrdBotDark", "border-bottom: 1px solid #" + darkBgdColor);
        addRule(styleId, ".hostBrdBotLight", "border-bottom: 1px solid #" + lightBgdColor);
        addRule(styleId, ".hostBrdBotContrast", "border-bottom: 1px solid rgba(0, 0, 0, 0.2)");

        addRule(styleId, ".hostButton", "background-color: #" + darkBgdColor);
        addRule(styleId, ".hostButton:hover", "background-color: #" + bgdColor);
        addRule(styleId, ".hostButton:active", "background-color: #" + darkBgdColor);
        addRule(styleId, ".hostButton", "border-color: #" + lightBgdColor);
    } else {
        if (_dashboardMode) {
            applyDashboardDark(styleId, appSkinInfo);
        } else {
            applyClassicDark(styleId, appSkinInfo);
        }
    }

    addRule(styleId, ".hostFontSize", "font-size: " + appSkinInfo.baseFontSize + "px;");
    addRule(styleId, ".hostFontFamily", "font-family: " + appSkinInfo.baseFontFamily);
    addRule(styleId, ".hostFontColor", "color: #" + (isLight ? "000000" : "E4E6EA") + " !important");
    addRule(styleId, ".hostFont", "font-size: " + appSkinInfo.baseFontSize + "px;");
    addRule(styleId, ".hostFont", "font-family: " + appSkinInfo.baseFontFamily);
    addRule(styleId, ".hostFont", "color: #" + (isLight ? "000000" : "E4E6EA") + " !important");
    
    var topcoatCSS = document.getElementById('topcoat');
    topcoatCSS.href = isLight ? LightTheme : DarkTheme;
    if (isLight) {
        document.body.classList.remove('dark-theme');
        document.body.classList.remove('dashboard-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        if (_dashboardMode) {
            document.body.classList.add('dashboard-theme');
        } else {
            document.body.classList.remove('dashboard-theme');
        }
    }
}

function onAppThemeColorChanged() {
    var skinInfo = JSON.parse(window.__adobe_cep__.getHostEnvironment()).appSkinInfo;
    updateThemeWithAppSkinInfo(skinInfo);
}

function setDashboardMode(enabled) {
    _dashboardMode = !!enabled;
    if (_lastSkinInfo) {
        updateThemeWithAppSkinInfo(_lastSkinInfo);
    }
}

var csInterface;
try {
    csInterface = new window.CSInterface();
    var extPath = csInterface.getSystemPath(window.SystemPath.EXTENSION);
    var storageResult = window.cep.fs.readFile(extPath + "/storage");
    if (!storageResult.err) {
        try {
            var storageData = JSON.parse(storageResult.data || "{}");
            var effectiveTheme = (!!storageData.dashboardTheme && (!storageData.theme || storageData.theme === "default"))
                ? "dashboard"
                : (storageData.theme || "default");
            _dashboardMode = effectiveTheme !== "default";
        } catch(e2) {}
    }
    _lastSkinInfo = csInterface.hostEnvironment.appSkinInfo;
    updateThemeWithAppSkinInfo(_lastSkinInfo);
    csInterface.addEventListener(window.CSInterface.THEME_COLOR_CHANGED_EVENT, onAppThemeColorChanged);
} catch(e) {}

export { setDashboardMode };
