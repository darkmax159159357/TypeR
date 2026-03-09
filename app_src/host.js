/* globals app, documents, activeDocument, ScriptUI, DialogModes, LayerKind, ActionReference, ActionDescriptor, executeAction, executeActionGet, stringIDToTypeID, jamEngine, jamJSON, jamText */

var charID = {
  Back: 1113678699, // 'Back'
  Background: 1113811815, // 'Bckg'
  Bottom: 1114926957, // 'Btom'
  By: 1115234336, // 'By  '
  Channel: 1130917484, // 'Chnl'
  Contract: 1131312227, // 'Cntc'
  Document: 1147366766, // 'Dcmn'
  Expand: 1165521006, // 'Expn'
  FrameSelect: 1718838636, // 'fsel'
  Horizontal: 1215461998, // 'Hrzn'
  Layer: 1283027488, // 'Lyr '
  Left: 1281713780, // 'Left'
  Move: 1836021349, // 'move'
  None: 1315925605, // 'None'
  Null: 1853189228, // 'null'
  Offset: 1332114292, // 'Ofst'
  Ordinal: 1332896878, // 'Ordn'
  PixelUnit: 592476268, // '#Pxl'
  Point: 1349415968, // 'Pnt '
  Property: 1349677170, // 'Prpr'
  Right: 1382508660, // 'Rght'
  Select: 1936483188, // 'slct'
  Set: 1936028772, // 'setd'
  Size: 1400512544, // 'Sz  '
  Target: 1416783732, // 'Trgt'
  Text: 1417180192, // 'Txt '
  TextLayer: 1417170034, // 'TxLr'
  TextShapeType: 1413830740, // 'TEXT'
  TextStyle: 1417180243, // 'TxtS'
  TextStyleRange: 1417180276, // 'Txtt'
  To: 1411391520, // 'T   '
  Top: 1416589344, // 'Top '
  Vertical: 1450341475, // 'Vrtc'
};

var _SAFE_PARAGRAPH_PROPS = [
  "align",
  "alignment",
  "firstLineIndent",
  "startIndent",
  "endIndent",
  "spaceBefore",
  "spaceAfter",
  "autoLeadingPercentage",
  "leadingType",
  "hyphenate",
  "hyphenateWordSize",
  "hyphenatePreLength",
  "hyphenatePostLength",
  "hyphenateLimit",
  "hyphenationZone",
  "hyphenateCapitalized",
  "hangingRoman",
  "burasagari",
  "textEveryLineComposer",
  "textComposerEngine",
];

var _DEFAULT_SELECTION_SCALE = 0.9;
var _MIN_TEXTBOX_WIDTH = 10;

var _debugLog = [];
function _logDebug(msg) { try { _debugLog.push(String(msg)); } catch (e2) {} }
function _flushDebugLog() {
  try {
    if (_debugLog.length === 0) return '';
    var log = _debugLog.join('\n');
    _debugLog = [];
    return log;
  } catch (e) { return 'LOG_ERROR: ' + e; }
}
function getDebugLog() {
  return _flushDebugLog();
}
function _returnWithLog(result) {
  var log = _flushDebugLog();
  return (result || '') + '|||LOG|||' + (log || '');
}

_logDebug('=== TypeR v2.9.5 host loaded ===');
try {
  _logDebug('[INIT] Photoshop ' + app.version + '  OS: ' + $.os);
  _logDebug('[INIT] Documents open: ' + documents.length);
} catch (e3) { _logDebug('[INIT] env check skipped'); }

try { jamEngine.displayDialogs = DialogModes.NO; } catch (e) { }

function _suppressDialogs() {
  var prev = DialogModes.ALL;
  try { prev = app.displayDialogs; } catch (e) { }
  try { app.displayDialogs = DialogModes.NO; } catch (e) { }
  return prev;
}

function _restoreDialogs(prev) {
  try { app.displayDialogs = prev; } catch (e) { }
}

var _hostState = {
  fallbackTextSize: 20,
  setActiveLayerText: {
    data: null,
    result: "",
  },
  createTextLayerInSelection: {
    data: null,
    result: "",
    point: false,
    padding: 0,
  },
  alignTextLayerToSelection: {
    result: "",
    resize: false,
    padding: 0,
  },
  changeActiveLayerTextSize: {
    value: 0,
    result: "",
  },
  selectionMonitor: {
    lastBoundsKey: null,
    callback: null,
  },
  createTextLayersInStoredSelections: {
    data: null,
    result: "",
    point: false,
    padding: 0,
    selections: [],
  },
  lastOpenedDocId: null,
};

function _clone(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Array) {
    var arr = [];
    for (var i = 0; i < obj.length; i++) {
      arr[i] = _clone(obj[i]);
    }
    return arr;
  }
  var result = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = _clone(obj[key]);
    }
  }
  return result;
}

function _getHostDefaultStyle() {
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
            color: { red: 0, green: 0, blue: 0 }
          }
        }
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
            hyphenate: false
          }
        }
      ]
    },
    typeUnit: "pixelsUnit"
  };
}

function _getHostDefaultStroke() {
  return {
    enabled: false,
    size: 0,
    opacity: 100,
    position: "outer",
    color: { r: 255, g: 255, b: 255 }
  };
}

function _ensureStyle(style) {
  var normalized = style ? _clone(style) : {};
  if (!normalized.textProps || !normalized.textProps.layerText) {
    normalized.textProps = _getHostDefaultStyle();
  }
  if (typeof normalized.stroke === "undefined") {
    normalized.stroke = _getHostDefaultStroke();
  }
  return normalized;
}

function _changeToPointText() {
  if (!_layerIsTextLayer()) return;
  try {
    if (app.activeDocument && app.activeDocument.activeLayer && app.activeDocument.activeLayer.textItem) {
      app.activeDocument.activeLayer.textItem.kind = TextType.POINTTEXT;
      return;
    }
  } catch (e) { _logDebug("error: " + e); }
  try {
    var reference = new ActionReference();
    reference.putProperty(charID.Property, charID.TextShapeType);
    reference.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var descriptor = new ActionDescriptor();
    descriptor.putReference(charID.Null, reference);
    descriptor.putEnumerated(charID.To, charID.TextShapeType, charID.Point);
    executeAction(charID.Set, descriptor, DialogModes.NO);
  } catch (e2) { _logDebug("error: " + e2); }
}

function _changeToBoxText() {
  if (!_layerIsTextLayer()) return;
  try {
    var reference = new ActionReference();
    reference.putProperty(charID.Property, charID.TextShapeType);
    reference.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var descriptor = new ActionDescriptor();
    descriptor.putReference(charID.Null, reference);
    descriptor.putEnumerated(charID.To, charID.TextShapeType, stringIDToTypeID("box"));
    executeAction(charID.Set, descriptor, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

function _layerIsTextLayer() {
  try {
    var layer = _getCurrent(charID.Layer, charID.Text);
    return layer.hasKey(charID.Text);
  } catch (e) {
    return false;
  }
}

function _textLayerIsPointText() {
  try {
    var textKey = _getCurrent(charID.Layer, charID.Text).getObjectValue(charID.Text);
    var textType = textKey.getList(stringIDToTypeID("textShape")).getObjectValue(0).getEnumerationValue(charID.TextShapeType);
    return textType === charID.Point;
  } catch (e) {
    return false;
  }
}

function _convertPixelToPoint(value) {
  return (Math.ceil(value) / activeDocument.resolution) * 72;
}

function _createCurrent(target, id) {
  var reference = new ActionReference();
  if (id > 0) reference.putProperty(charID.Property, id);
  reference.putEnumerated(target, charID.Ordinal, charID.Target);
  return reference;
}

function _getCurrent(target, id) {
  return executeActionGet(_createCurrent(target, id));
}

function _deselect() {
  try {
    var reference = new ActionReference();
    reference.putProperty(charID.Channel, charID.FrameSelect);
    var descriptor = new ActionDescriptor();
    descriptor.putReference(charID.Null, reference);
    descriptor.putEnumerated(charID.To, charID.Ordinal, charID.None);
    executeAction(charID.Set, descriptor, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

function _getBoundsFromDescriptor(bounds) {
  var top = bounds.getInteger(charID.Top);
  var left = bounds.getInteger(charID.Left);
  var right = bounds.getInteger(charID.Right);
  var bottom = bounds.getInteger(charID.Bottom);
  return {
    top: top,
    left: left,
    right: right,
    bottom: bottom,
    width: right - left,
    height: bottom - top,
    xMid: (left + right) / 2,
    yMid: (top + bottom) / 2,
  };
}

function _getCurrentSelectionBounds() {
  var doc;
  try {
    doc = _getCurrent(charID.Document, charID.FrameSelect);
  } catch (e) {
    return undefined;
  }
  if (!doc || !doc.hasKey(charID.FrameSelect)) return undefined;
  var bounds = doc.getObjectValue(charID.FrameSelect);
  return _getBoundsFromDescriptor(bounds);
}

function _getMultiSelectionBounds() {
  var doc;
  try {
    doc = _getCurrent(charID.Document, charID.FrameSelect);
  } catch (e) {
    return undefined;
  }
  if (!doc || !doc.hasKey(charID.FrameSelect)) return undefined;

  try {
    var savedHistoryState = app.activeDocument.activeHistoryState;
    var pathCreated = false;
    var boundsArr = [];
    try {
      var pmDesc = new ActionDescriptor();
      var ref = new ActionReference();
      ref.putClass(stringIDToTypeID("path"));
      pmDesc.putReference(charID.Null, ref);
      var ref2 = new ActionReference();
      ref2.putProperty(stringIDToTypeID("selectionClass"), stringIDToTypeID("selection"));
      pmDesc.putReference(stringIDToTypeID("from"), ref2);
      pmDesc.putUnitDouble(stringIDToTypeID("tolerance"), stringIDToTypeID("pixelsUnit"), 2.0);
      executeAction(stringIDToTypeID("make"), pmDesc, DialogModes.NO);
      pathCreated = true;

      var workPath = app.activeDocument.pathItems.getByName("Work Path");
      for (var i = 0; i < workPath.subPathItems.length; i++) {
        var subPath = workPath.subPathItems[i];
        var left = 99999, top = 99999, right = -99999, bottom = -99999;
        for (var j = 0; j < subPath.pathPoints.length; j++) {
          var pt = subPath.pathPoints[j].anchor;
          if (pt[0] < left) left = pt[0];
          if (pt[0] > right) right = pt[0];
          if (pt[1] < top) top = pt[1];
          if (pt[1] > bottom) bottom = pt[1];
        }
        var w = right - left;
        var h = bottom - top;
        if (w > 5 && h > 5) {
          boundsArr.push({
            top: top, left: left, right: right, bottom: bottom,
            width: w, height: h,
            xMid: (left + right) / 2, yMid: (top + bottom) / 2
          });
        }
      }
    } finally {
      try { if (pathCreated) app.activeDocument.pathItems.getByName("Work Path").remove(); } catch(e2) {}
      try { app.activeDocument.activeHistoryState = savedHistoryState; } catch(e3) {}
    }

    if (boundsArr.length > 1) {
      return boundsArr;
    }
  } catch (e) { _logDebug("error: " + e); }

  var bounds = doc.getObjectValue(charID.FrameSelect);
  return _getBoundsFromDescriptor(bounds);
}

function _getCurrentTextLayerBounds() {
  try {
    var boundsTypeId = stringIDToTypeID("bounds");
    var boundsDesc = _getCurrent(charID.Layer, boundsTypeId);
    if (!boundsDesc || !boundsDesc.hasKey(boundsTypeId)) return null;
    var bounds = boundsDesc.getObjectValue(boundsTypeId);
    return _getBoundsFromDescriptor(bounds);
  } catch (e) {
    return null;
  }
}

function _modifySelectionBounds(amount) {
  if (amount == 0) return;
  try {
    var size = new ActionDescriptor();
    size.putUnitDouble(charID.By, charID.PixelUnit, Math.abs(amount));
    executeAction(amount > 0 ? charID.Expand : charID.Contract, size, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}


function _resizeTextBoxToContent(width, currentBounds) {
  if (!_layerIsTextLayer()) return;
  if (!currentBounds || !(width > 0)) return;
  try {
    var textParams = jamText.getLayerText();
    if (!textParams || !textParams.layerText || !textParams.layerText.textStyleRange) return;
    var ranges = textParams.layerText.textStyleRange;
    var maxSize = 0;
    for (var i = 0; i < ranges.length; i++) {
      var s = ranges[i].textStyle.size;
      if (typeof s === "number" && s > maxSize) maxSize = s;
    }
    if (maxSize <= 0) maxSize = _hostState.fallbackTextSize || 20;
    _setTextBoxSize(width, currentBounds.height + maxSize + 2);
  } catch (e) { _logDebug("error: " + e); }
}

function _createMagicWandSelection(tolerance) {
  try {
    var bounds = _getCurrentTextLayerBounds();
    if (!bounds) return;
    var x = Math.max(bounds.left - 5, 0);
    var y = Math.max(bounds.yMid, 0);
    _magicWandAtPoint(x, y, tolerance);
  } catch (e) { _logDebug("error: " + e); }
}

function _magicWandAtPoint(x, y, tolerance) {
  try {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charID.Channel, charID.FrameSelect);
    desc.putReference(charID.Null, ref);
    var pos = new ActionDescriptor();
    pos.putUnitDouble(charID.Horizontal, charID.PixelUnit, x);
    pos.putUnitDouble(charID.Vertical, charID.PixelUnit, y);
    desc.putObject(charID.To, stringIDToTypeID("paint"), pos);
    desc.putInteger(stringIDToTypeID("tolerance"), tolerance || 20);
    desc.putBoolean(stringIDToTypeID("contiguous"), true);
    desc.putBoolean(stringIDToTypeID("merged"), true);
    desc.putBoolean(stringIDToTypeID("antiAlias"), true);
    executeAction(charID.Set, desc, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

function _moveLayer(offsetX, offsetY) {
  try {
    var amount = new ActionDescriptor();
    amount.putUnitDouble(charID.Horizontal, charID.PixelUnit, offsetX);
    amount.putUnitDouble(charID.Vertical, charID.PixelUnit, offsetY);
    var target = new ActionDescriptor();
    target.putReference(charID.Null, _createCurrent(charID.Layer));
    target.putObject(charID.To, charID.Offset, amount);
    executeAction(charID.Move, target, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

/**
 * Retrieve stroke information from the active layer.
 * Returns null if no stroke is found.
 */
function _getLayerStroke() {
  try {
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Lefx"));
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref);
    if (!desc.hasKey(charIDToTypeID("Lefx"))) return null;

    var fx = desc.getObjectValue(charIDToTypeID("Lefx"));
    if (!fx.hasKey(charIDToTypeID("FrFX"))) return null;

    var fr = fx.getObjectValue(charIDToTypeID("FrFX"));
    var col = fr.getObjectValue(charIDToTypeID("Clr "));

    return {
      enabled: fr.getBoolean(charIDToTypeID("enab")),
      position: fr.getEnumerationValue(charIDToTypeID("Styl")) == charIDToTypeID("OutF") ? "outer" : "other",
      size: fr.getUnitDoubleValue(charIDToTypeID("Sz  ")),
      opacity: fr.getUnitDoubleValue(charIDToTypeID("Opct")),
      color: {
        r: col.getDouble(charIDToTypeID("Rd  ")),
        g: col.getDouble(charIDToTypeID("Grn ")),
        b: col.getDouble(charIDToTypeID("Bl  ")),
      },
    };
  } catch (e) {
    return null;
  }
}

/**
 * Apply or update a stroke on the active layer.
 * @param {Object} stroke - {size, color:{r,g,b}, opacity, enabled}
 *                          position is forced to "outer".
 */
function _setLayerStroke(stroke) {
  if (!stroke || (stroke.size <= 0 && stroke.enabled !== true)) return;
  if (!stroke.color || typeof stroke.color.r !== "number") return;

  var d = new ActionDescriptor();
  var r = new ActionReference();
  r.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Lefx"));
  r.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  d.putReference(charIDToTypeID("null"), r);

  var fx = new ActionDescriptor();
  fx.putUnitDouble(charIDToTypeID("Scl "), charIDToTypeID("#Prc"), 100);

  var fr = new ActionDescriptor();
  fr.putBoolean(charIDToTypeID("enab"), true);
  fr.putBoolean(stringIDToTypeID("present"), true);
  fr.putBoolean(stringIDToTypeID("showInDialog"), true);

  fr.putEnumerated(charIDToTypeID("Styl"), charIDToTypeID("FStl"), charIDToTypeID("OutF"));
  fr.putEnumerated(charIDToTypeID("PntT"), charIDToTypeID("FrFl"), charIDToTypeID("SClr"));
  fr.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), charIDToTypeID("Nrml"));

  fr.putUnitDouble(charIDToTypeID("Sz  "), charIDToTypeID("#Pxl"), stroke.size || 3);
  fr.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), stroke.opacity || 100);

  var c = new ActionDescriptor();
  c.putDouble(charIDToTypeID("Rd  "), stroke.color.r);
  c.putDouble(charIDToTypeID("Grn "), stroke.color.g);
  c.putDouble(charIDToTypeID("Bl  "), stroke.color.b);
  fr.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), c);

  fx.putObject(charIDToTypeID("FrFX"), charIDToTypeID("FrFX"), fr);
  d.putObject(charIDToTypeID("T   "), charIDToTypeID("Lefx"), fx);

  try {
    executeAction(charIDToTypeID("setd"), d, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

function _getTextLayerColor() {
  try {
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Txt "));
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(ref);
    var txt = desc.getObjectValue(charIDToTypeID("Txt "));
    var ranges = txt.getList(stringIDToTypeID("textStyleRange"));
    if (ranges.count > 0) {
      var style = ranges.getObjectValue(0).getObjectValue(stringIDToTypeID("textStyle"));
      if (style.hasKey(charIDToTypeID("Clr "))) {
        var col = style.getObjectValue(charIDToTypeID("Clr "));
        return {
          r: col.getDouble(charIDToTypeID("Rd  ")),
          g: col.getDouble(charIDToTypeID("Grn ")),
          b: col.getDouble(charIDToTypeID("Bl  "))
        };
      }
    }
  } catch (e) { _logDebug("error: " + e); }
  return { r: 0, g: 0, b: 0 };
}

function _addInverseStrokeToLayer() {
  if (!_layerIsTextLayer()) return;
  var textColor = _getTextLayerColor();
  var inverseColor = {
    r: 255 - textColor.r,
    g: 255 - textColor.g,
    b: 255 - textColor.b
  };
  var canvasHeight;
  try {
    canvasHeight = app.activeDocument.height.as("px");
  } catch (e) {
    canvasHeight = 2000;
  }
  var strokeSize = Math.max(1, Math.round(canvasHeight * 0.0025));
  _setLayerStroke({ size: strokeSize, color: inverseColor, opacity: 100, enabled: true });
}

function _setDiacXOffset(val) {
  var d = new ActionDescriptor();
  var r = new ActionReference();
  r.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("TxtS"));
  r.putEnumerated(charIDToTypeID("TxLr"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  d.putReference(charIDToTypeID("null"), r);

  var t = new ActionDescriptor();
  t.putInteger(stringIDToTypeID("textOverrideFeatureName"), 808466486);
  t.putInteger(stringIDToTypeID("typeStyleOperationType"), 3);
  t.putUnitDouble(stringIDToTypeID("diacXOffset"), charIDToTypeID("#Pxl"), val);
  d.putObject(charIDToTypeID("T   "), charIDToTypeID("TxtS"), t);

  try {
    executeAction(charIDToTypeID("setd"), d, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

function _setMarkYOffset(val) {
  var d = new ActionDescriptor();
  var r = new ActionReference();
  r.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("TxtS"));
  r.putEnumerated(charIDToTypeID("TxLr"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  d.putReference(charIDToTypeID("null"), r);

  var t = new ActionDescriptor();
  t.putInteger(stringIDToTypeID("textOverrideFeatureName"), 808466488);
  t.putInteger(stringIDToTypeID("typeStyleOperationType"), 3);
  t.putUnitDouble(stringIDToTypeID("markYDistFromBaseline"), charIDToTypeID("#Pxl"), val);
  d.putObject(charIDToTypeID("T   "), charIDToTypeID("TxtS"), t);

  try {
    executeAction(charIDToTypeID("setd"), d, DialogModes.NO);
  } catch (e) { _logDebug("error: " + e); }
}

function _applyMiddleEast(textStyle) {
  if (!textStyle) return;
  if (!_layerIsTextLayer()) return;
  if (textStyle.diacXOffset != null) _setDiacXOffset(textStyle.diacXOffset);
  if (textStyle.markYDistFromBaseline != null) _setMarkYOffset(textStyle.markYDistFromBaseline);
}

function _applyTextDirection(direction, textLength) {
  if (!direction) return;
  if (!_layerIsTextLayer()) return;
  var psDirection = direction === "rtl" ? "dirRightToLeft" : "dirLeftToRight";

  try {
    var currentText = jamText.getLayerText();
    if (
      !currentText ||
      !currentText.layerText ||
      !currentText.layerText.paragraphStyleRange ||
      !currentText.layerText.paragraphStyleRange.length
    ) {
      return;
    }

    var updatedText = _clone(currentText);
    var paragraphRanges = updatedText.layerText.paragraphStyleRange;
    var targetLength = textLength;
    if (targetLength == null && updatedText.layerText && updatedText.layerText.textKey) {
      targetLength = updatedText.layerText.textKey.length;
    }

    for (var i = 0; i < paragraphRanges.length; i++) {
      var range = paragraphRanges[i] || {};
      var paragraphStyle = range.paragraphStyle || {};

      paragraphStyle.directionType = psDirection;
      paragraphStyle.textComposerEngine = "textOptycaComposer";

      range.paragraphStyle = paragraphStyle;
      if (targetLength != null) {
        range.from = typeof range.from === "number" ? range.from : 0;
        range.to = targetLength;
      }
      paragraphRanges[i] = range;
    }

    updatedText.layerText.paragraphStyleRange = paragraphRanges;
    jamText.setLayerText(updatedText);
  } catch (e) {
    // Ignore errors if directionType is not supported on this PS version
  }
}

function _normFontStyle(s) {
  return (s || "").replace(/[\s\-_]+/g, "").toLowerCase();
}

function _findFontVariant(baseFamily, wantBold, wantItalic) {
  if (!baseFamily) return null;
  var fonts = app.fonts;
  var candidates = [];
  for (var i = 0; i < fonts.length; i++) {
    if (fonts[i].family === baseFamily) {
      candidates.push({ font: fonts[i], norm: _normFontStyle(fonts[i].style) });
    }
  }
  if (candidates.length <= 1) return null;

  var hasBold = function (n) { return /bold|heavy|black|ultra/.test(n) && !/ultra\s*light/i.test(n); };
  var hasItalic = function (n) { return /italic|oblique/.test(n); };
  var isBoldOnly = function (n) { return hasBold(n) && !hasItalic(n); };
  var isItalicOnly = function (n) { return hasItalic(n) && !hasBold(n); };
  var isBoldItalic = function (n) { return hasBold(n) && hasItalic(n); };

  var preferExact = function (arr, test) {
    var exactBold = ["bold", "boldmt"];
    var exactItalic = ["italic", "oblique"];
    var exactBI = ["bolditalic", "boldoblique"];
    var result = null;
    for (var j = 0; j < arr.length; j++) {
      if (!test(arr[j].norm)) continue;
      if (!result) { result = arr[j].font; }
      if (wantBold && wantItalic) {
        for (var k = 0; k < exactBI.length; k++) { if (arr[j].norm === exactBI[k]) return arr[j].font; }
      } else if (wantBold) {
        for (var k = 0; k < exactBold.length; k++) { if (arr[j].norm === exactBold[k]) return arr[j].font; }
      } else {
        for (var k = 0; k < exactItalic.length; k++) { if (arr[j].norm === exactItalic[k]) return arr[j].font; }
      }
    }
    return result;
  };

  if (wantBold && wantItalic) {
    var bi = preferExact(candidates, isBoldItalic);
    if (bi) return bi;
  } else if (wantBold) {
    var b = preferExact(candidates, isBoldOnly);
    if (b) return b;
  } else if (wantItalic) {
    var it = preferExact(candidates, isItalicOnly);
    if (it) return it;
  }
  return null;
}

function _buildRichTextRanges(baseRange, textRuns, textLength) {
  if (!baseRange || !baseRange.textStyle || !textRuns || !textRuns.length) return null;
  var ranges = [];
  var offset = 0;
  var baseFont = baseRange.textStyle.fontPostScriptName;
  var baseFamily = null;
  try {
    for (var fi = 0; fi < app.fonts.length; fi++) {
      if (app.fonts[fi].postScriptName === baseFont) {
        baseFamily = app.fonts[fi].family;
        break;
      }
    }
  } catch (e) {}

  var variantCache = {};
  for (var i = 0; i < textRuns.length; i++) {
    var run = textRuns[i] || {};
    var runText = run.text || "";
    var runLength = runText.length;
    if (!runLength) continue;
    var textStyle = _clone(baseRange.textStyle);
    if (run.bold || run.italic) {
      var cacheKey = (run.bold ? "b" : "") + (run.italic ? "i" : "");
      if (variantCache[cacheKey] === undefined) {
        variantCache[cacheKey] = _findFontVariant(baseFamily, !!run.bold, !!run.italic);
      }
      var variant = variantCache[cacheKey];
      if (variant) {
        textStyle.fontPostScriptName = variant.postScriptName;
        textStyle.fontName = variant.name;
        textStyle.fontStyleName = variant.style;
        textStyle.syntheticBold = false;
        textStyle.syntheticItalic = false;
      } else {
        if (run.bold) textStyle.syntheticBold = true;
        if (run.italic) textStyle.syntheticItalic = true;
      }
    }
    ranges.push({
      from: offset,
      to: offset + runLength,
      textStyle: textStyle,
    });
    offset += runLength;
  }
  if (offset < textLength) {
    ranges.push({
      from: offset,
      to: textLength,
      textStyle: _clone(baseRange.textStyle),
    });
  }
  return ranges.length ? ranges : null;
}

function _applyRichTextRanges(textParams, textRuns, textLength) {
  if (!textParams || !textParams.layerText || !textRuns || !textRuns.length) return false;
  var baseRange = textParams.layerText.textStyleRange && textParams.layerText.textStyleRange[0];
  var ranges = _buildRichTextRanges(baseRange, textRuns, textLength);
  if (!ranges) return false;
  textParams.layerText.textStyleRange = ranges;
  return true;
}

function _cleanWhitespace(text) {
  var lines = text.split(/\r/);
  for (var i = 0; i < lines.length; i++) {
    lines[i] = lines[i].replace(/^\s+|\s+$/g, '').replace(/[ \t]+/g, ' ');
  }
  var result = lines.join('\r');
  return result.replace(/^\s+|\s+$/g, '');
}

function _createAndSetLayerText(data, width, height, originX, originY) {
  var style = _ensureStyle(data.style);
  data.text = _cleanWhitespace(data.text);
  style.textProps.layerText.textKey = data.text.replace(/\n+/g, "");
  style.textProps.layerText.textStyleRange[0].to = data.text.length;
  style.textProps.layerText.paragraphStyleRange[0].to = data.text.length;
  if (style.textProps.layerText.paragraphStyleRange) {
    for (var p = 0; p < style.textProps.layerText.paragraphStyleRange.length; p++) {
      if (style.textProps.layerText.paragraphStyleRange[p].paragraphStyle) {
        style.textProps.layerText.paragraphStyleRange[p].paragraphStyle.hyphenate = false;
      }
    }
  }
  _applyRichTextRanges(style.textProps, data.richTextRuns, data.text.length);
  var sizeProp = style.textProps.layerText.textStyleRange[0].textStyle.size;
  if (typeof sizeProp !== "number") {
    try {
      var textParams = jamText.getLayerText();
      _hostState.fallbackTextSize = textParams.layerText.textStyleRange[0].textStyle.size;
    } catch (error) { }
    style.textProps.layerText.textStyleRange[0].textStyle.size = _hostState.fallbackTextSize;
  }

  // If originX/originY are provided, position the text box at those pixel coordinates.
  var leftPt = typeof originX === "number" ? Math.round(_convertPixelToPoint(originX)) : 0;
  var topPt = typeof originY === "number" ? Math.round(_convertPixelToPoint(originY)) : 0;
  var widthPt = Math.round(_convertPixelToPoint(width));
  var heightPt = Math.round(_convertPixelToPoint(height));

  style.textProps.layerText.textShape = [
    {
      textType: "box",
      orientation: "horizontal",
      bounds: {
        top: topPt,
        left: leftPt,
        right: leftPt + widthPt,
        bottom: topPt + heightPt,
      },
    },
  ];
  try {
    jamEngine.jsonPlay("make", {
      target: ["<reference>", [["textLayer", ["<class>", null]]]],
      using: jamText.toLayerTextObject(style.textProps),
    });
  } catch (e) { return; }
  _applyMiddleEast(style.textProps.layerText.textStyleRange[0].textStyle);
  if (style.stroke) {
    _setLayerStroke(style.stroke);
  }
  if (data.direction) {
    _applyTextDirection(data.direction, data.text.length);
  }
}

function _setTextBoxSize(width, height) {
  if (!_layerIsTextLayer()) return;
  var widthPt = _convertPixelToPoint(width);
  var heightPt = _convertPixelToPoint(height);
  if (!(widthPt > 0) || !(heightPt > 0)) return;
  try {
    var box = [
      {
        textType: "box",
        orientation: "horizontal",
        bounds: {
          top: 0,
          left: 0,
          right: widthPt,
          bottom: heightPt,
        },
      },
    ];
    jamText.setLayerText({ layerText: { textShape: box } });
  } catch (e) { _logDebug("error: " + e); }
}

function _checkSelection() {
  var selection = _getCurrentSelectionBounds();
  if (selection === undefined) {
    return { error: "noSelection" };
  }
  _modifySelectionBounds(-10);
  selection = _getCurrentSelectionBounds();
  if (selection === undefined || selection.width * selection.height < 200) {
    return { error: "smallSelection" };
  }
  return selection;
}

function _forEachSelectedLayer(action) {
  var selectedLayers = [];
  try {
    var reference = new ActionReference();
    var targetLayers = stringIDToTypeID("targetLayers");
    reference.putProperty(charID.Property, targetLayers);
    reference.putEnumerated(charID.Document, charID.Ordinal, charID.Target);
    var doc = executeActionGet(reference);
    if (doc.hasKey(targetLayers)) {
      doc = doc.getList(targetLayers);
      var ref2 = new ActionReference();
      ref2.putProperty(charID.Property, charID.Background);
      ref2.putEnumerated(charID.Layer, charID.Ordinal, charID.Back);
      var offset = executeActionGet(ref2).getBoolean(charID.Background) ? 0 : 1;
      for (var i = 0; i < doc.count; i++) {
        selectedLayers.push(doc.getReference(i).getIndex() + offset);
      }
    }
  } catch (e) {
    return;
  }
  if (selectedLayers.length > 1) {
    for (var j = 0; j < selectedLayers.length; j++) {
      try {
        var descr = new ActionDescriptor();
        var ref3 = new ActionReference();
        ref3.putIndex(charID.Layer, selectedLayers[j]);
        descr.putReference(charID.Null, ref3);
        executeAction(charID.Select, descr, DialogModes.NO);
        action(selectedLayers[j]);
      } catch (e2) { }
    }
    try {
      var ref4 = new ActionReference();
      for (var k = 0; k < selectedLayers.length; k++) {
        ref4.putIndex(charID.Layer, selectedLayers[k]);
      }
      var descr2 = new ActionDescriptor();
      descr2.putReference(charID.Null, ref4);
      executeAction(charID.Select, descr2, DialogModes.NO);
    } catch (e3) { }
  } else if (selectedLayers.length === 1) {
    action(selectedLayers[0]);
  }
}

/* ========================================================= */
/* ============ full methods for suspendHistory ============ */
/* ========================================================= */

function _setActiveLayerText() {
  var state = _hostState.setActiveLayerText;
  var payload = state.data;
  state.result = "";
  if (!payload) {
    return;
  } else if (!documents.length) {
    state.result = "doc";
    return;
  } else if (!_layerIsTextLayer()) {
    state.result = "layer";
    return;
  }
  var dataText = payload.text;
  if (dataText) dataText = _cleanWhitespace(dataText);
  var dataStyle = payload.style;
  var dataRuns = payload.richTextRuns;
  var targetTextLength = 0;

  _forEachSelectedLayer(function () {
    var oldBounds = _getCurrentTextLayerBounds();
    if (!oldBounds) return;
    var isPoint = _textLayerIsPointText();
    if (isPoint) _changeToBoxText();
    var oldTextParams = jamText.getLayerText();
    var newTextParams;
    if (dataText && dataStyle) {
      newTextParams = dataStyle.textProps;
      if (newTextParams.layerText.textStyleRange[0].textStyle.size == null &&
        oldTextParams.layerText.textStyleRange &&
        oldTextParams.layerText.textStyleRange[0] &&
        oldTextParams.layerText.textStyleRange[0].textStyle.size != null) {
        newTextParams.layerText.textStyleRange[0].textStyle.size = oldTextParams.layerText.textStyleRange[0].textStyle.size;
      }
      newTextParams.layerText.textKey = dataText.replace(/\n+/g, "");
      newTextParams.layerText.textStyleRange[0].to = dataText.length;
      newTextParams.layerText.paragraphStyleRange[0].to = dataText.length;
      targetTextLength = dataText.length;
      _applyRichTextRanges(newTextParams, dataRuns, targetTextLength);
    } else if (dataText) {
      newTextParams = {
        layerText: {
          textKey: dataText.replace(/\n+/g, ""),
        },
      };
      if (oldTextParams.layerText.textStyleRange && oldTextParams.layerText.textStyleRange[0]) {
        newTextParams.layerText.textStyleRange = [oldTextParams.layerText.textStyleRange[0]];
        newTextParams.layerText.textStyleRange[0].to = dataText.length;
      }
      if (oldTextParams.layerText.paragraphStyleRange && oldTextParams.layerText.paragraphStyleRange[0]) {
        // Create a minimal paragraphStyleRange without directionType to avoid RTL issues
        var oldParagraphStyle = oldTextParams.layerText.paragraphStyleRange[0].paragraphStyle || {};
        var newParagraphStyle = {};

        // Copy only safe properties, explicitly excluding directionType
        for (var i = 0; i < _SAFE_PARAGRAPH_PROPS.length; i++) {
          var prop = _SAFE_PARAGRAPH_PROPS[i];
          if (oldParagraphStyle[prop] !== undefined) {
            newParagraphStyle[prop] = oldParagraphStyle[prop];
          }
        }

        newTextParams.layerText.paragraphStyleRange = [{
          from: 0,
          to: dataText.length,
          paragraphStyle: newParagraphStyle
        }];
      }
      targetTextLength = dataText.length;
      _applyRichTextRanges(newTextParams, dataRuns, targetTextLength);
    } else if (dataStyle) {
      var text = oldTextParams.layerText.textKey || "";
      newTextParams = dataStyle.textProps;
      delete newTextParams.layerText.textKey;
      newTextParams.layerText.textStyleRange[0].from = 0;
      newTextParams.layerText.textStyleRange[0].to = text.length;
      newTextParams.layerText.paragraphStyleRange[0].from = 0;
      newTextParams.layerText.paragraphStyleRange[0].to = text.length;
      targetTextLength = text.length;
    }
    newTextParams.layerText.textShape = [oldTextParams.layerText.textShape[0]];
    newTextParams.layerText.textShape[0].bounds.bottom *= 15;
    newTextParams.typeUnit = oldTextParams.typeUnit;
    try {
      jamText.setLayerText(newTextParams);
    } catch (e4) { return; }
    var userDirection = payload.direction;
    if (userDirection === "") userDirection = null;
    _applyTextDirection(userDirection, targetTextLength);
    _applyMiddleEast(newTextParams.layerText.textStyleRange[0].textStyle);
    if (dataStyle && dataStyle.stroke) {
      _setLayerStroke(dataStyle.stroke);
    }
    var newBounds = _getCurrentTextLayerBounds();
    if (!newBounds) return;
    if (isPoint) {
      _changeToPointText();
    } else {
      var textSize = 12;
      if (dataStyle) {
        textSize = dataStyle.textProps.layerText.textStyleRange[0].textStyle.size;
      } else if (oldTextParams.layerText.textStyleRange && oldTextParams.layerText.textStyleRange[0]) {
        textSize = oldTextParams.layerText.textStyleRange[0].textStyle.size;
      }
      newTextParams.layerText.textShape[0].bounds.bottom = _convertPixelToPoint(newBounds.height + textSize + 2);
      try {
        jamText.setLayerText({
          layerText: {
            textShape: newTextParams.layerText.textShape,
          },
        });
      } catch (e5) { }
    }
    if (!oldBounds.bottom) oldBounds = newBounds;
    var offsetX = oldBounds.xMid - newBounds.xMid;
    var offsetY = oldBounds.yMid - newBounds.yMid;
    _moveLayer(offsetX, offsetY);
  });

  state.result = "";
}

function _isCJK(ch) {
  var code = ch.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0x3040 && code <= 0x309F) ||
    (code >= 0x30A0 && code <= 0x30FF) ||
    (code >= 0xAC00 && code <= 0xD7AF) ||
    (code >= 0xFF00 && code <= 0xFFEF);
}

function _estimateCharWidth(ch) {
  var code = ch.charCodeAt(0);
  if (_isCJK(ch)) return 2.0;
  if (code >= 0x0600 && code <= 0x06FF) return 1.1;
  if (code >= 0x0750 && code <= 0x077F) return 1.1;
  if (code >= 0xFB50 && code <= 0xFDFF) return 1.1;
  if (code >= 0xFE70 && code <= 0xFEFF) return 1.1;
  if (code >= 0x0E00 && code <= 0x0E7F) return 1.2;
  if (code >= 0x0900 && code <= 0x097F) return 1.2;
  if (ch === 'M' || ch === 'W') return 1.5;
  if (ch >= 'A' && ch <= 'Z') return 1.2;
  if (ch === 'm' || ch === 'w') return 1.4;
  if (ch === 'i' || ch === 'l' || ch === '!' || ch === '|' || ch === '1') return 0.5;
  if (ch === 'j' || ch === 'f' || ch === 't' || ch === 'r') return 0.7;
  if (ch === '.' || ch === ',' || ch === ':' || ch === ';' || ch === '\'' || ch === '"') return 0.4;
  if (ch === '-' || ch === '\u2013' || ch === '\u2014') return 0.7;
  if (ch === '\u2026') return 1.5;
  return 1.0;
}

function _estimateWordWidth(word) {
  var w = 0;
  for (var i = 0; i < word.length; i++) {
    w += _estimateCharWidth(word.charAt(i));
  }
  return w;
}

function _splitTextToWords(text) {
  var tokens = [];
  var current = "";
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    if (ch === ' ') {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
    } else if (_isCJK(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      tokens.push(ch);
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function _padLineBreaks(str) {
  var result = str.replace(/([^ ])\r/g, '$1 \r');
  var lines = result.split('\r');
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    var trimmed = ln.replace(/^\s+/, '').replace(/\s+$/, '');
    if (trimmed.length > 0 && trimmed.charAt(0) === '\u2026' && trimmed.length > 1) {
      lines[i] = '  ' + ln;
    }
    trimmed = lines[i].replace(/^\s+/, '').replace(/\s+$/, '');
    if (trimmed.length > 1 && trimmed.charAt(trimmed.length - 1) === '\u2026') {
      lines[i] = lines[i] + '  ';
    }
  }
  return lines.join('\r');
}

function _shapeTextForBubble(text, selection, targetWidth, targetHeight) {
  text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  var words = _splitTextToWords(text);
  var aspectRatio = selection.width / selection.height;
  _logDebug('=== SHAPE ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + ' AR=' + aspectRatio.toFixed(2) + ' ===');
  _logDebug('[SEL] Bubble: ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + 'px  AR: ' + aspectRatio.toFixed(2) + '  Center: (' + Math.round(selection.xMid) + ',' + Math.round(selection.yMid) + ')  TextArea: ' + Math.round(targetWidth) + 'x' + Math.round(targetHeight));
  _logDebug('[SHAPE] Text: ' + words.length + ' words  ' + text.length + ' chars  "' + (text.length > 100 ? text.slice(0, 100) + '...' : text) + '"');
  if (words.length <= 2) {
    _logDebug('[SHAPE] Skip: <=2 words, no shaping needed');
    return text;
  }
  var isWide = aspectRatio > 2.0;
  var isTall = aspectRatio < 0.5;
  if (words.length === 3 && !isWide) {
    var w0 = _estimateWordWidth(words[0]);
    var w1 = _estimateWordWidth(words[1]);
    var w2 = _estimateWordWidth(words[2]);
    var totalW3 = w0 + w1 + w2;
    var maxW3 = Math.max(w0, w1, w2);
    var longestIdx = (w0 === maxW3) ? 0 : ((w1 === maxW3) ? 1 : 2);
    _logDebug('[SHAPE] 3-word: w0=' + w0.toFixed(1) + ' w1=' + w1.toFixed(1) + ' w2=' + w2.toFixed(1) + ' longest=' + longestIdx + ' AR=' + aspectRatio.toFixed(2));
    if (isTall) {
      _logDebug('[SHAPE] 3-word tall: 3 lines');
      return _padLineBreaks(words.join('\r'));
    }
    if (longestIdx === 1 && maxW3 / (totalW3 / 3) > 1.15) {
      _logDebug('[SHAPE] 3-word: middle longest + prominent, 3 lines diamond');
      return _padLineBreaks(words.join('\r'));
    }
    var shortW = (longestIdx === 0) ? (w1 + w2 + 0.5) : (w0 + w1 + 0.5);
    if (shortW / maxW3 >= 0.5) {
      if (longestIdx === 0) {
        _logDebug('[SHAPE] 3-word: first longest, merge 2+3');
        return _padLineBreaks(words[0] + '\r' + _joinWords([words[1], words[2]]));
      } else {
        _logDebug('[SHAPE] 3-word: last longest, merge 1+2');
        return _padLineBreaks(_joinWords([words[0], words[1]]) + '\r' + words[2]);
      }
    }
    _logDebug('[SHAPE] 3-word: similar widths, 2 lines');
    return _padLineBreaks(_joinWords([words[0], words[1]]) + '\r' + words[2]);
  }
  var mode = isWide ? 'WIDE (AR>2.0)' : (isTall ? 'TALL (AR<0.5)' : 'CIRCULAR');
  _logDebug('[SHAPE] Mode: ' + mode);
  if (isWide) {
    var r = _shapeWide(words);
    _logDebug('[SHAPE] Result: "' + r.replace(/\r/g, ' | ') + '"');
    return _padLineBreaks(r);
  } else if (isTall) {
    var r = _shapeTall(words);
    _logDebug('[SHAPE] Result: "' + r.replace(/\r/g, ' | ') + '"');
    return _padLineBreaks(r);
  } else {
    return _padLineBreaks(_shapeCircular(words, targetWidth, targetHeight));
  }
}

function _optimalSplit(words, wordLens, targetChars, numLines) {
  var n = words.length;
  var m = numLines;
  var GAP = 0.5;
  if (m >= n) {
    var singleLines = [];
    for (var i = 0; i < n; i++) singleLines.push(words[i]);
    return singleLines.join('\r');
  }

  var prefix = [0];
  for (var i = 0; i < n; i++) {
    prefix.push(prefix[i] + wordLens[i]);
  }

  var INF = 1e18;
  var dp = [];
  var from = [];
  for (var i = 0; i <= n; i++) {
    dp.push([]);
    from.push([]);
    for (var j = 0; j <= m; j++) {
      dp[i].push(INF);
      from[i].push(0);
    }
  }
  dp[0][0] = 0;

  for (var j = 1; j <= m; j++) {
    for (var i = j; i <= n - (m - j); i++) {
      for (var k = j - 1; k < i; k++) {
        if (dp[k][j - 1] >= INF) continue;
        var nGaps = i - k - 1;
        var lineWidth = prefix[i] - prefix[k] + nGaps * GAP;
        var target = targetChars[j - 1];
        var dev = lineWidth - target;
        var cost = dp[k][j - 1] + dev * dev;
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          from[i][j] = k;
        }
      }
    }
  }

  var breaks = [];
  var pos = n;
  for (var j = m; j >= 1; j--) {
    breaks.push(from[pos][j]);
    pos = from[pos][j];
  }
  breaks.reverse();
  breaks.push(n);

  var lines = [];
  for (var i = 0; i < m; i++) {
    var lineWords = [];
    for (var w = breaks[i]; w < breaks[i + 1]; w++) {
      lineWords.push(words[w]);
    }
    lines.push(_joinWords(lineWords));
  }

  return lines.join('\r');
}

function _computeResultDiamondScore(resultStr) {
  var ls = resultStr.split('\r');
  if (ls.length < 3) return 0;
  var widths = _getLineWidthsFromLines(ls);
  var mid = Math.floor(ls.length / 2);
  var isEven = (ls.length % 2 === 0);
  var midW = isEven ? (widths[mid - 1] + widths[mid]) / 2 : widths[mid];
  var edgeW = (widths[0] + widths[ls.length - 1]) / 2;
  var score = midW - edgeW;
  var symPenalty = 0;
  for (var i = 0; i < Math.floor(ls.length / 2); i++) {
    var diff = Math.abs(widths[i] - widths[ls.length - 1 - i]);
    symPenalty += diff;
  }
  symPenalty = symPenalty / Math.max(1, Math.floor(ls.length / 2));
  var monoPenalty = 0;
  for (var i = 1; i <= mid; i++) {
    if (widths[i] < widths[i - 1]) monoPenalty += widths[i - 1] - widths[i];
  }
  for (var i = mid + 1; i < ls.length; i++) {
    if (widths[i] > widths[i - 1]) monoPenalty += widths[i] - widths[i - 1];
  }
  return score - symPenalty * 0.3 - monoPenalty * 2.0;
}

function _getLineWidthsFromLines(lines) {
  var widths = [];
  for (var i = 0; i < lines.length; i++) {
    var ws = _splitTextToWords(lines[i]);
    var w = 0;
    var gaps = 0;
    for (var j = 0; j < ws.length; j++) {
      w += _estimateWordWidth(ws[j]);
      if (j > 0) {
        var prevLast = ws[j - 1].charAt(ws[j - 1].length - 1);
        var curFirst = ws[j].charAt(0);
        if (!_isCJK(prevLast) && !_isCJK(curFirst)) {
          gaps++;
        }
      }
    }
    w += gaps * 0.5;
    widths.push(w);
  }
  return widths;
}

function _makeDiamondTargets(numLines, totalChars) {
  var ratios = [], sumR = 0;
  if (numLines <= 2) {
    ratios = numLines === 1 ? [1] : [1.1, 0.9];
    sumR = numLines === 1 ? 1 : 2;
  } else {
    var b = numLines / 2;
    for (var i = 0; i < numLines; i++) {
      var y = (i + 0.5) - b;
      var s = Math.sqrt(1 - (y * y) / (b * b));
      if (s < 0.35) s = 0.35;
      ratios.push(s);
      sumR += s;
    }
  }
  var targets = [];
  for (var i = 0; i < numLines; i++) targets.push((ratios[i] / sumR) * totalChars);
  return targets;
}

function _getLineWidths(resultLines) {
  return _getLineWidthsFromLines(resultLines);
}

function _hasOrphanLine(resultLines) {
  if (resultLines.length < 3) return false;
  var widths = _getLineWidths(resultLines);
  var maxW = 0;
  for (var i = 0; i < widths.length; i++) {
    if (widths[i] > maxW) maxW = widths[i];
  }
  for (var i = 0; i < resultLines.length; i++) {
    var lw = _splitTextToWords(resultLines[i]);
    if (lw.length === 1) {
      if (widths[i] < maxW * 0.40) return true;
    }
    if (lw.length <= 2 && widths[i] < maxW * 0.25) return true;
  }
  return false;
}

function _estimateFontSize(resLines, targetWidth, targetHeight, numLines) {
  var widths = _getLineWidths(resLines);
  var maxW = 0;
  for (var i = 0; i < widths.length; i++) {
    if (widths[i] > maxW) maxW = widths[i];
  }
  var CW = 0.55;
  var LR = 1.25;
  var fW = (maxW > 0) ? targetWidth / (maxW * CW) : 999;
  var fH = targetHeight / (numLines * LR);
  return Math.min(fW, fH);
}

function _shapeCircular(words, targetWidth, targetHeight) {
  var totalWords = words.length;
  if (totalWords <= 2) return _joinWords(words);

  var wordLens = [];
  var totalW = 0;
  for (var i = 0; i < words.length; i++) {
    wordLens.push(_estimateWordWidth(words[i]));
    totalW += wordLens[i];
  }

  var tableN;
  if (totalWords <= 5) tableN = 2;
  else if (totalWords <= 8) tableN = 3;
  else if (totalWords <= 12) tableN = 4;
  else if (totalWords <= 14) tableN = 5;
  else if (totalWords <= 25) tableN = 6;
  else tableN = 7;

  var numLines;
  if (targetWidth && targetHeight && targetWidth > 0 && targetHeight > 0) {
    var rawN = Math.sqrt(totalW * targetHeight * 0.6 / targetWidth);
    numLines = Math.max(2, Math.min(10, Math.round(rawN)));
    var maxByWords = Math.max(2, Math.floor(totalWords / 2));
    numLines = Math.min(numLines, maxByWords, tableN + 1);
    _logDebug('[SHAPE] numLines: table=' + tableN + '  raw=' + rawN.toFixed(2) + '  maxByWords=' + maxByWords + '  final=' + numLines);
  } else {
    numLines = tableN;
    _logDebug('[SHAPE] numLines: table=' + tableN + ' (no dimensions)');
  }
  numLines = Math.max(2, numLines);
  if (numLines > totalWords) numLines = totalWords;

  var targets = _makeDiamondTargets(numLines, totalW);
  var res = _optimalSplit(words, wordLens, targets, numLines);
  var lines = res.split('\r');
  _logDebug('[SHAPE] Split(' + numLines + 'L): "' + res.replace(/\r/g, ' | ') + '"');

  if (lines.length >= 3) {
    var firstWords = _splitTextToWords(lines[0]);
    var secondWords = _splitTextToWords(lines[1]);
    var wFL = 0; for (var wi = 0; wi < firstWords.length; wi++) wFL += _estimateWordWidth(firstWords[wi]);
    var wSL = 0; for (var wi = 0; wi < secondWords.length; wi++) wSL += _estimateWordWidth(secondWords[wi]);
    var firstTarget = targets[0];
    var midTarget1 = targets[Math.floor(targets.length / 2)];
    var diamondExpectsShortFirst = (lines.length >= 3 && firstTarget < midTarget1 * 0.7);
    var isOrphanFirst = false;
    if (!diamondExpectsShortFirst) {
      isOrphanFirst = (firstWords.length === 1) || (firstWords.length === 2 && wFL < wSL * 0.55);
    } else if (firstWords.length === 1 && wFL < firstTarget * 0.35) {
      isOrphanFirst = true;
    }
    if (isOrphanFirst) {
      _logDebug('[WARN] Orphan first: ' + firstWords.length + ' words  wFL=' + Math.round(wFL) + ' wSL=' + Math.round(wSL) + ' ratio=' + (wFL / wSL).toFixed(2));
    }
    if (isOrphanFirst && secondWords.length >= 3) {
      var tryFirst = firstWords.concat([secondWords[0]]);
      var trySecond = secondWords.slice(1);
      var wFirst = 0; for (var wi = 0; wi < tryFirst.length; wi++) wFirst += _estimateWordWidth(tryFirst[wi]);
      var wSecond = 0; for (var wi = 0; wi < trySecond.length; wi++) wSecond += _estimateWordWidth(trySecond[wi]);
      if (wSecond >= wFirst * 0.85) {
        lines[0] = _joinWords(tryFirst);
        lines[1] = _joinWords(trySecond);
        _logDebug('[SHAPE] Orphan first: word-move fixed  "' + lines[0] + ' | ' + lines[1] + '"');
      } else {
        var eqRes = _shapeEqualLines(words, numLines);
        var eqLines = eqRes.split('\r');
        var eqFirst = _splitTextToWords(eqLines[0]);
        if (eqFirst.length >= 2) {
          lines = eqLines;
          _logDebug('[SHAPE] Orphan first: equal-split fixed');
        } else {
          _logDebug('[WARN] Orphan first: could not fix');
        }
      }
    }
  }

  if (lines.length >= 2) {
    var lastIdx = lines.length - 1;
    var lastWords = _splitTextToWords(lines[lastIdx]);
    var prevWords = _splitTextToWords(lines[lastIdx - 1]);
    var wLast = 0; for (var wi = 0; wi < lastWords.length; wi++) wLast += _estimateWordWidth(lastWords[wi]);
    var wPrev = 0; for (var wi = 0; wi < prevWords.length; wi++) wPrev += _estimateWordWidth(prevWords[wi]);
    var lastTarget = targets[targets.length - 1];
    var midTarget = targets[Math.floor(targets.length / 2)];
    var diamondExpectsShortEdge = (lines.length >= 3 && lastTarget < midTarget * 0.7);
    var isOrphanLast = false;
    if (!diamondExpectsShortEdge) {
      isOrphanLast = (lastWords.length === 1) || (lastWords.length === 2 && wLast < wPrev * 0.55);
    } else if (lastWords.length === 1 && wLast < lastTarget * 0.35) {
      isOrphanLast = true;
    }
    if (isOrphanLast) {
      _logDebug('[WARN] Orphan last: ' + lastWords.length + ' words  wLast=' + Math.round(wLast) + ' wPrev=' + Math.round(wPrev) + ' ratio=' + (wLast / wPrev).toFixed(2));
    }
    if (isOrphanLast && prevWords.length >= 2 && lines.length >= 3) {
      var moved = false;
      if (prevWords.length >= 3) {
        var tryPrev = prevWords.slice(0, prevWords.length - 1);
        var tryLast = [prevWords[prevWords.length - 1]].concat(lastWords);
        var wP = 0; for (var wi = 0; wi < tryPrev.length; wi++) wP += _estimateWordWidth(tryPrev[wi]);
        var wL = 0; for (var wi = 0; wi < tryLast.length; wi++) wL += _estimateWordWidth(tryLast[wi]);
        if (wP >= wL * 0.85) {
          lines[lastIdx - 1] = _joinWords(tryPrev);
          lines[lastIdx] = _joinWords(tryLast);
          moved = true;
          _logDebug('[SHAPE] Orphan last: word-move fixed  wP=' + Math.round(wP) + ' wL=' + Math.round(wL) + '  "' + lines[lastIdx - 1] + ' | ' + lines[lastIdx] + '"');
        }
      }
      if (!moved) {
        var eqRes2 = _shapeEqualLines(words, numLines);
        var eqLines2 = eqRes2.split('\r');
        var eqLast = _splitTextToWords(eqLines2[eqLines2.length - 1]);
        var eqFirst2 = _splitTextToWords(eqLines2[0]);
        if (eqLast.length >= 2 && eqFirst2.length >= 2) {
          var eqMidIdx = Math.floor((eqLines2.length - 1) / 2);
          var eqMidW = 0; var eqMidWords = _splitTextToWords(eqLines2[eqMidIdx]);
          for (var wi = 0; wi < eqMidWords.length; wi++) eqMidW += _estimateWordWidth(eqMidWords[wi]);
          var eqEdgeW = 0;
          var eqFW = _splitTextToWords(eqLines2[0]);
          for (var wi = 0; wi < eqFW.length; wi++) eqEdgeW += _estimateWordWidth(eqFW[wi]);
          var eqLW = _splitTextToWords(eqLines2[eqLines2.length - 1]);
          for (var wi = 0; wi < eqLW.length; wi++) eqEdgeW += _estimateWordWidth(eqLW[wi]);
          var eqDiamond = eqMidW - eqEdgeW / 2;

          var origMidIdx = Math.floor((lines.length - 1) / 2);
          var origMidW = 0; var origMidWords = _splitTextToWords(lines[origMidIdx]);
          for (var wi = 0; wi < origMidWords.length; wi++) origMidW += _estimateWordWidth(origMidWords[wi]);
          var origEdgeW = 0;
          var origFW = _splitTextToWords(lines[0]);
          for (var wi = 0; wi < origFW.length; wi++) origEdgeW += _estimateWordWidth(origFW[wi]);
          var origLW = _splitTextToWords(lines[lines.length - 1]);
          for (var wi = 0; wi < origLW.length; wi++) origEdgeW += _estimateWordWidth(origLW[wi]);
          var origDiamond = origMidW - origEdgeW / 2;

          _logDebug('[SHAPE] Orphan last: diamond  orig=' + Math.round(origDiamond) + '  equal=' + Math.round(eqDiamond));
          if (eqDiamond > origDiamond) {
            _logDebug('[SHAPE] Orphan last: equal-split wins');
            lines = eqLines2;
          } else {
            _logDebug('[SHAPE] Orphan last: kept original (better diamond)');
          }
        } else {
          _logDebug('[WARN] Orphan last: fallback N-1 lines (' + (numLines - 1) + 'L)');
          var fallback = _shapeEqualLines(words, numLines - 1);
          return fallback;
        }
      }
    }
  }

  var finalResult = lines.join('\r');
  _logDebug('[SHAPE] Final: "' + finalResult.replace(/\r/g, ' | ') + '"');

  if (numLines > 2 && totalWords > 4) {
    var hasSingleWordLine = false;
    var edgeTarget = targets[0];
    var midTarget2 = targets[Math.floor(targets.length / 2)];
    var diamondShortEdge = (edgeTarget < midTarget2 * 0.7);
    for (var si = 0; si < lines.length; si++) {
      if (_splitTextToWords(lines[si]).length === 1) {
        if (diamondShortEdge && (si === 0 || si === lines.length - 1)) continue;
        hasSingleWordLine = true; break;
      }
    }
    if (hasSingleWordLine) {
      var reducedN = numLines - 1;
      if (reducedN >= 2) {
        var reducedTargets = _makeDiamondTargets(reducedN, totalW);
        var reducedRes = _optimalSplit(words, wordLens, reducedTargets, reducedN);
        var reducedLines = reducedRes.split('\r');
        var stillHasSingle = false;
        for (var si2 = 0; si2 < reducedLines.length; si2++) {
          if (_splitTextToWords(reducedLines[si2]).length === 1) { stillHasSingle = true; break; }
        }
        if (!stillHasSingle) {
          _logDebug('[SHAPE] SingleWordFix: ' + numLines + 'L had single-word line, using ' + reducedN + 'L');
          lines = reducedLines;
          finalResult = reducedRes;
          numLines = reducedN;
        } else {
          _logDebug('[WARN] SingleWordLine: ' + numLines + 'L has single-word line, ' + reducedN + 'L also has one');
        }
      }
    }
  }

  if (numLines > 2 && totalWords >= 6) {
    var bestScore = _computeResultDiamondScore(finalResult);
    var bestResult = finalResult;
    var bestN = numLines;
    var minTry = Math.max(3, numLines - 2);
    for (var tryN = numLines - 1; tryN >= minTry; tryN--) {
      var tryTargets = _makeDiamondTargets(tryN, totalW);
      var tryRes = _optimalSplit(words, wordLens, tryTargets, tryN);
      var tryScore = _computeResultDiamondScore(tryRes);
      var tryLines = tryRes.split('\r');
      var hasOrphan = false;
      if (tryLines.length >= 3) {
        var tEdgeT = tryTargets[0];
        var tMidT = tryTargets[Math.floor(tryTargets.length / 2)];
        var tDiamondEdge = (tEdgeT < tMidT * 0.7);
        if (!tDiamondEdge) {
          if (_splitTextToWords(tryLines[0]).length === 1) hasOrphan = true;
          if (_splitTextToWords(tryLines[tryLines.length - 1]).length === 1) hasOrphan = true;
        }
      }
      var tryWidths = _getLineWidthsFromLines(tryLines);
      var tryMaxW = 0, trySumW = 0;
      for (var wi = 0; wi < tryWidths.length; wi++) {
        if (tryWidths[wi] > tryMaxW) tryMaxW = tryWidths[wi];
        trySumW += tryWidths[wi];
      }
      var tryAvgW = trySumW / tryLines.length;
      var widthSpread = (tryAvgW > 0) ? tryMaxW / tryAvgW : 1;
      _logDebug('[SHAPE] DiamondCheck: ' + bestN + 'L score=' + bestScore.toFixed(1) + '  ' + tryN + 'L score=' + tryScore.toFixed(1) + '  orphan=' + hasOrphan + '  spread=' + widthSpread.toFixed(2));
      if (widthSpread > 1.5) {
        _logDebug('[SHAPE] DiamondCheck: skip ' + tryN + 'L (spread too high, font would shrink)');
        continue;
      }
      if (!hasOrphan && tryScore > bestScore) {
        bestScore = tryScore;
        bestResult = tryRes;
        bestN = tryN;
      }
    }
    if (bestN !== numLines) {
      _logDebug('[SHAPE] DiamondFix: using ' + bestN + 'L (score=' + bestScore.toFixed(1) + ')');
      finalResult = bestResult;
      lines = bestResult.split('\r');
      numLines = bestN;
    }
  }

  return finalResult;
}

function _joinWords(wordArr) {
  if (wordArr.length === 0) return "";
  var result = wordArr[0];
  for (var i = 1; i < wordArr.length; i++) {
    var prevLast = result.charAt(result.length - 1);
    var nextFirst = wordArr[i].charAt(0);
    if (_isCJK(prevLast) || _isCJK(nextFirst)) {
      result += wordArr[i];
    } else {
      result += ' ' + wordArr[i];
    }
  }
  return result;
}

function _shapeEqualLines(words, numLines) {
  if (numLines > words.length) numLines = words.length;
  if (numLines <= 1) return _joinWords(words);
  var wordLens = [];
  var totalChars = 0;
  for (var i = 0; i < words.length; i++) {
    wordLens.push(_estimateWordWidth(words[i]));
    totalChars += wordLens[i];
  }
  var avg = totalChars / numLines;

  var targetChars = [];
  for (var i = 0; i < numLines; i++) {
    targetChars.push(avg);
  }

  return _optimalSplit(words, wordLens, targetChars, numLines);
}

function _shapeWide(words) {
  var numLines;
  if (words.length <= 5) numLines = 2;
  else if (words.length <= 12) numLines = 3;
  else if (words.length <= 20) numLines = 4;
  else numLines = 5;
  if (numLines > words.length) numLines = words.length;
  return _shapeEqualLines(words, numLines);
}

function _shapeTall(words) {
  var numLines = Math.min(Math.max(4, Math.ceil(words.length / 2)), 7);
  return _shapeEqualLines(words, numLines);
}

function _applyAutoFitToLayer(selection, autoFitPadding, useScaling, scalingMin, autoShape, autoFit) {
  var paddingBase = (autoFitPadding || 13);
  var aspectRatio = selection.width / selection.height;
  var circularity = Math.min(aspectRatio, 1 / aspectRatio);
  var isRound = circularity > 0.75;
  var targetWidth, targetHeight, hPad, vPad;
  if (isRound) {
    var inscW = selection.width / 1.414;
    var inscH = selection.height / 1.414;
    var ellipseMargin = paddingBase * 0.15;
    targetWidth = inscW * (1 - ellipseMargin / 100);
    targetHeight = inscH * (1 - ellipseMargin / 100);
    hPad = (selection.width - targetWidth) / 2;
    vPad = (selection.height - targetHeight) / 2;
  } else {
    var effectivePadding = (paddingBase - 4) + 4 * circularity;
    hPad = selection.width * (effectivePadding / 100);
    vPad = selection.height * (effectivePadding / 100);
    var maxPadFraction = 0.20;
    if (hPad > selection.width * maxPadFraction) hPad = selection.width * maxPadFraction;
    if (vPad > selection.height * maxPadFraction) vPad = selection.height * maxPadFraction;
    targetWidth = selection.width - (hPad * 2);
    targetHeight = selection.height - (vPad * 2);
  }
  _logDebug('=== FIT ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + ' AR=' + aspectRatio.toFixed(2) + ' ===');
  _logDebug('[SEL] Bubble: ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + 'px  AR: ' + aspectRatio.toFixed(2) + '  circ=' + circularity.toFixed(2) + (isRound ? ' ROUND' : ' WIDE') + '  Center: (' + Math.round(selection.xMid) + ',' + Math.round(selection.yMid) + ')');
  _logDebug('[FIT] hPad=' + Math.round(hPad) + 'px vPad=' + Math.round(vPad) + 'px  -> TextArea: ' + Math.round(targetWidth) + 'x' + Math.round(targetHeight) + 'px');
  _logDebug('[FIT] Mode: autoShape=' + autoShape + '  autoFit=' + autoFit);
  if (targetWidth <= 0 || targetHeight <= 0) return;

  var textParams;
  try {
    textParams = jamText.getLayerText();
  } catch (e) { return; }
  if (!textParams || !textParams.layerText || !textParams.layerText.textStyleRange) return;

  if (autoFit) {
    textParams.layerText.antiAlias = "antiAliasStrong";
  }

  if (autoShape && textParams.layerText.textKey) {
    var rawText = textParams.layerText.textKey;
    var shaped = _shapeTextForBubble(rawText, selection, targetWidth, targetHeight);
    if (shaped !== rawText) {
      textParams.layerText.textKey = shaped;
      var newLen = shaped.length;
      if (textParams.layerText.textStyleRange) {
        for (var r = 0; r < textParams.layerText.textStyleRange.length; r++) {
          textParams.layerText.textStyleRange[r].from = 0;
          textParams.layerText.textStyleRange[r].to = newLen;
        }
      }
      if (textParams.layerText.paragraphStyleRange) {
        var pStyle = textParams.layerText.paragraphStyleRange[0].paragraphStyle || {};
        pStyle.hyphenate = false;
        textParams.layerText.paragraphStyleRange = [{ from: 0, to: newLen, paragraphStyle: pStyle }];
      }
    }
  }

  if (textParams.layerText.paragraphStyleRange) {
    for (var p = 0; p < textParams.layerText.paragraphStyleRange.length; p++) {
      if (textParams.layerText.paragraphStyleRange[p].paragraphStyle) {
        textParams.layerText.paragraphStyleRange[p].paragraphStyle.hyphenate = false;
      }
    }
  }

  var ranges = textParams.layerText.textStyleRange;
  var origSize = ranges[0].textStyle.size || 20;
  var origLeading = ranges[0].textStyle.leading || origSize * 1.2;
  var leadingRatio = origLeading / origSize;
  _logDebug('[FIT] InitFont: ' + origSize.toFixed(1) + 'pt  leading=' + origLeading.toFixed(1) + 'pt  ratio=' + leadingRatio.toFixed(2) + '  chars=' + (textParams.layerText.textKey || '').replace(/[\r\n]/g,'').length);

  var widePt = _convertPixelToPoint(targetWidth * 5);
  var bigH = _convertPixelToPoint(targetHeight * 10);
  textParams.layerText.textShape = [{
    textType: "box",
    orientation: "horizontal",
    bounds: { top: 0, left: 0, right: widePt, bottom: bigH }
  }];

  var textContent = textParams.layerText.textKey || "";

  if (autoFit) {
    var words = textContent.replace(/\r/g, ' ').split(/\s+/);
    var longestWord = "";
    for (var w = 0; w < words.length; w++) {
      if (words[w].length > longestWord.length) longestWord = words[w];
    }
    var low = 6, high = 120, bestSize = low;
    while (high - low > 0.5) {
      var mid = (low + high) / 2;
      for (var r = 0; r < ranges.length; r++) {
        ranges[r].textStyle.size = mid;
        ranges[r].textStyle.leading = mid * leadingRatio;
        ranges[r].textStyle.horizontalScale = 100;
      }
      try { jamText.setLayerText(textParams); } catch (e) { break; }
      var bounds = _getCurrentTextLayerBounds();
      if (!bounds || bounds.width <= 0) {
        high = mid;
        continue;
      }
      if (bounds.width <= targetWidth && bounds.height <= targetHeight) {
        bestSize = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    bestSize = Math.max(Math.floor(bestSize * 10) / 10, 6);
    _logDebug('[FIT] BinarySearch: result=' + bestSize.toFixed(1) + 'pt');

    var currentLineCount = (textContent.match(/\r/g) || []).length + 1;
    if (autoShape && currentLineCount >= 4 && words.length >= 6) {
      var plainText = textContent.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
      var tryWords = _splitTextToWords(plainText);
      if (tryWords.length >= 4) {
        var fewerLines = currentLineCount - 1;
        var tryWordLens = [];
        var tryTotalW = 0;
        for (var tw = 0; tw < tryWords.length; tw++) {
          tryWordLens.push(_estimateWordWidth(tryWords[tw]));
          tryTotalW += tryWordLens[tw];
        }
        var fewerTargets = _makeDiamondTargets(fewerLines, tryTotalW);
        var fewerShaped = _optimalSplit(tryWords, tryWordLens, fewerTargets, fewerLines);
        var fewerShapedLines = fewerShaped.split('\r');
        var fewerHasOrphan = false;
        for (var fi = 0; fi < fewerShapedLines.length; fi++) {
          var lineWords = _splitTextToWords(fewerShapedLines[fi]);
          if (lineWords.length === 1 && lineWords[0].length <= 2 && !_isCJK(lineWords[0].charAt(0))) { fewerHasOrphan = true; break; }
        }
        if (!fewerHasOrphan) {
          var testText = fewerShaped;
          var testLen = testText.length;
          textParams.layerText.textKey = testText;
          for (var r = 0; r < ranges.length; r++) {
            textParams.layerText.textStyleRange[r].from = 0;
            textParams.layerText.textStyleRange[r].to = testLen;
          }
          if (textParams.layerText.paragraphStyleRange) {
            for (var r = 0; r < textParams.layerText.paragraphStyleRange.length; r++) {
              textParams.layerText.paragraphStyleRange[r].from = 0;
              textParams.layerText.paragraphStyleRange[r].to = testLen;
            }
          }
          var fLow = 6, fHigh = 120, fBest = fLow;
          while (fHigh - fLow > 0.5) {
            var fMid = (fLow + fHigh) / 2;
            for (var r = 0; r < ranges.length; r++) {
              ranges[r].textStyle.size = fMid;
              ranges[r].textStyle.leading = fMid * leadingRatio;
              ranges[r].textStyle.horizontalScale = 100;
            }
            try { jamText.setLayerText(textParams); } catch (e) { break; }
            var fBounds = _getCurrentTextLayerBounds();
            if (!fBounds || fBounds.width <= 0) { fHigh = fMid; continue; }
            if (fBounds.width <= targetWidth && fBounds.height <= targetHeight) {
              fBest = fMid; fLow = fMid;
            } else { fHigh = fMid; }
          }
          fBest = Math.max(Math.floor(fBest * 10) / 10, 6);
          var sizeGain = (fBest - bestSize) / bestSize;
          _logDebug('[FIT] PostOpt: ' + currentLineCount + 'L=' + bestSize.toFixed(1) + 'pt  ' + fewerLines + 'L=' + fBest.toFixed(1) + 'pt  gain=' + (sizeGain * 100).toFixed(1) + '%');
          if (sizeGain >= 0.10) {
            bestSize = fBest;
            textContent = testText;
            _logDebug('[FIT] PostOpt: using ' + fewerLines + 'L (+' + (sizeGain * 100).toFixed(1) + '% font)');
          } else {
            textParams.layerText.textKey = textContent;
            for (var r = 0; r < ranges.length; r++) {
              textParams.layerText.textStyleRange[r].from = 0;
              textParams.layerText.textStyleRange[r].to = textContent.length;
            }
            if (textParams.layerText.paragraphStyleRange) {
              for (var r = 0; r < textParams.layerText.paragraphStyleRange.length; r++) {
                textParams.layerText.paragraphStyleRange[r].from = 0;
                textParams.layerText.paragraphStyleRange[r].to = textContent.length;
              }
            }
          }
        }
      }
    }

    if (longestWord.length > 0) {
      var wordCheckParams = _clone(textParams);
      wordCheckParams.layerText.textKey = longestWord;
      if (wordCheckParams.layerText.textStyleRange) {
        for (var r = 0; r < wordCheckParams.layerText.textStyleRange.length; r++) {
          wordCheckParams.layerText.textStyleRange[r].from = 0;
          wordCheckParams.layerText.textStyleRange[r].to = longestWord.length;
          wordCheckParams.layerText.textStyleRange[r].textStyle.size = bestSize;
          wordCheckParams.layerText.textStyleRange[r].textStyle.leading = bestSize * leadingRatio;
          wordCheckParams.layerText.textStyleRange[r].textStyle.horizontalScale = 100;
        }
      }
      if (wordCheckParams.layerText.paragraphStyleRange) {
        for (var r = 0; r < wordCheckParams.layerText.paragraphStyleRange.length; r++) {
          wordCheckParams.layerText.paragraphStyleRange[r].from = 0;
          wordCheckParams.layerText.paragraphStyleRange[r].to = longestWord.length;
        }
      }
      try {
        jamText.setLayerText(wordCheckParams);
        var wordBounds = _getCurrentTextLayerBounds();
        if (wordBounds && wordBounds.width > targetWidth) {
          var wordRatio = targetWidth / wordBounds.width;
          bestSize = Math.max(bestSize * wordRatio * 0.95, 6);
        }
      } catch (e) { _logDebug("error: " + e); }
    }

    for (var r = 0; r < ranges.length; r++) {
      ranges[r].textStyle.size = bestSize;
      ranges[r].textStyle.leading = bestSize * leadingRatio;
      ranges[r].textStyle.horizontalScale = 100;
    }
    textParams.layerText.textKey = textContent;
    if (textParams.layerText.textStyleRange) {
      for (var r = 0; r < textParams.layerText.textStyleRange.length; r++) {
        textParams.layerText.textStyleRange[r].to = textContent.length;
      }
    }
    if (textParams.layerText.paragraphStyleRange) {
      for (var r = 0; r < textParams.layerText.paragraphStyleRange.length; r++) {
        textParams.layerText.paragraphStyleRange[r].to = textContent.length;
      }
    }

    var bestScaling = 100;
    if (useScaling && scalingMin && scalingMin < 100) {
      var rawText2 = textParams.layerText.textKey || "";
      if (rawText2.length > 1) {
        var largerSize = Math.min(bestSize * 1.2, 120);
        if (largerSize > bestSize + 0.5) {
          var scLow = scalingMin;
          var scHigh = 100;
          var scBest = -1;
          while (scHigh - scLow > 1) {
            var scMid = Math.floor((scLow + scHigh) / 2);
            for (var r = 0; r < ranges.length; r++) {
              ranges[r].textStyle.size = largerSize;
              ranges[r].textStyle.leading = largerSize * leadingRatio;
              ranges[r].textStyle.horizontalScale = scMid;
            }
            try { jamText.setLayerText(textParams); } catch (e) { break; }
            var tb = _getCurrentTextLayerBounds();
            if (tb && tb.width <= targetWidth && tb.height <= targetHeight) {
              scBest = scMid;
              scLow = scMid;
            } else {
              scHigh = scMid;
            }
          }
          if (scBest >= scalingMin) {
            bestSize = largerSize;
            bestScaling = scBest;
            _logDebug('[FIT] Scaling: ' + scBest + '% at ' + largerSize.toFixed(1) + 'pt (min=' + scalingMin + '%)  +' + (largerSize - bestSize).toFixed(1) + 'pt gain');
          } else {
            _logDebug('[WARN] Scaling: no improvement found (scBest=' + scBest + '%)');
          }
        }
      }
    }
    _logDebug('[FIT] Result: ' + bestSize.toFixed(1) + 'pt  scale=' + bestScaling + '%  (was ' + origSize.toFixed(1) + 'pt  d=' + (bestSize - origSize).toFixed(1) + 'pt)');

    for (var r = 0; r < ranges.length; r++) {
      ranges[r].textStyle.size = bestSize;
      ranges[r].textStyle.leading = bestSize * leadingRatio;
      ranges[r].textStyle.horizontalScale = bestScaling;
    }

    textParams.layerText.textShape[0].bounds.right = widePt;
    textParams.layerText.textShape[0].bounds.bottom = bigH;
    try { jamText.setLayerText(textParams); } catch (e) { _logDebug("error: " + e); }
    var finalBounds = _getCurrentTextLayerBounds();
    if (finalBounds) {
      var wUtil = Math.round(finalBounds.width / targetWidth * 100);
      var hUtil = Math.round(finalBounds.height / targetHeight * 100);
      _logDebug('[FIT] Rendered: ' + Math.round(finalBounds.width) + 'x' + Math.round(finalBounds.height) + 'px  vs target ' + Math.round(targetWidth) + 'x' + Math.round(targetHeight) + 'px  (W:' + wUtil + '% H:' + hUtil + '%)');
    }

    var boxRightPt = _convertPixelToPoint((finalBounds ? finalBounds.width : targetWidth) + 20);
    var boxBottomPt = _convertPixelToPoint(targetHeight + 10);
    textParams.layerText.textShape[0].bounds.right = boxRightPt;
    textParams.layerText.textShape[0].bounds.bottom = boxBottomPt;
    try { jamText.setLayerText(textParams); } catch (e) { _logDebug("error: " + e); }

  } else {
    for (var r = 0; r < ranges.length; r++) {
      ranges[r].textStyle.size = origSize;
      ranges[r].textStyle.leading = origLeading;
      ranges[r].textStyle.horizontalScale = 100;
    }
    textParams.layerText.textKey = textContent;
    if (textParams.layerText.textStyleRange) {
      for (var r = 0; r < textParams.layerText.textStyleRange.length; r++) {
        textParams.layerText.textStyleRange[r].to = textContent.length;
      }
    }
    if (textParams.layerText.paragraphStyleRange) {
      for (var r = 0; r < textParams.layerText.paragraphStyleRange.length; r++) {
        textParams.layerText.paragraphStyleRange[r].to = textContent.length;
      }
    }
    textParams.layerText.textShape[0].bounds.right = widePt;
    textParams.layerText.textShape[0].bounds.bottom = bigH;
    try { jamText.setLayerText(textParams); } catch (e) { _logDebug("error: " + e); }
    var finalBounds = _getCurrentTextLayerBounds();
    var boxRightPt = _convertPixelToPoint((finalBounds ? finalBounds.width : targetWidth) + 20);
    var boxBottomPt = _convertPixelToPoint((finalBounds ? finalBounds.height : targetHeight) + 10);
    textParams.layerText.textShape[0].bounds.right = boxRightPt;
    textParams.layerText.textShape[0].bounds.bottom = boxBottomPt;
    try { jamText.setLayerText(textParams); } catch (e) { _logDebug("error: " + e); }
  }

  var newBounds = _getCurrentTextLayerBounds();
  if (newBounds) {
    var ox = selection.xMid - newBounds.xMid;
    var oy = selection.yMid - newBounds.yMid;
    _moveLayer(ox, oy);
    _logDebug('[FIT] Final: ' + Math.round(newBounds.width) + 'x' + Math.round(newBounds.height) + 'px in bubble ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + 'px  offset=(' + Math.round(ox) + ',' + Math.round(oy) + ')');
  }
  _logDebug('=== END ===');
}

function _createTextLayerInSelection() {
  var state = _hostState.createTextLayerInSelection;
  _logDebug('=== PASTE Single ===');
  if (!documents.length) {
    _logDebug('[ERR] No document open');
    state.result = "doc";
    return;
  }

  var selection = _checkSelection();
  if (selection.error) {
    _logDebug('[ERR] Selection error: ' + selection.error);
    state.result = selection.error;
    return;
  }
  var textPreview = (state.data.text || '').length > 50 ? state.data.text.slice(0, 50) + '...' : (state.data.text || '');
  _logDebug('[SEL] Selection: ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + 'px  Center: (' + Math.round(selection.xMid) + ',' + Math.round(selection.yMid) + ')');
  _logDebug('[INFO] Text: "' + textPreview + '"  (' + (state.data.text || '').length + ' chars)');
  var scale = (state.autoFit || state.autoShape) ? 1.0 : _DEFAULT_SELECTION_SCALE;
  _logDebug('[INFO] Scale: ' + (scale * 100) + '%  padding=' + (state.padding || 0) + 'px  point=' + !!state.point + '  AF=' + !!state.autoFit + '  AS=' + !!state.autoShape);
  var width = selection.width * scale;
  if (state.padding > 0) {
    width = Math.max(width - state.padding * 2, _MIN_TEXTBOX_WIDTH);
  }
  var height = selection.height * 15;
  _createAndSetLayerText(state.data, width, height);
  var bounds = _getCurrentTextLayerBounds();
  if (!bounds) { _logDebug('[ERR] No layer bounds after creation'); state.result = "layer"; return; }
  if (state.point) {
    _changeToPointText();
  } else {
    _resizeTextBoxToContent(width, bounds);
  }
  bounds = _getCurrentTextLayerBounds();
  if (!bounds) { _logDebug('[ERR] No layer bounds after resize'); state.result = "layer"; return; }
  var offsetX = selection.xMid - bounds.xMid;
  var offsetY = selection.yMid - bounds.yMid;
  _moveLayer(offsetX, offsetY);
  _logDebug('[INFO] Layer placed: offset=(' + Math.round(offsetX) + ',' + Math.round(offsetY) + ')  boxW=' + Math.round(width) + 'px');

  if (state.autoFit || state.autoShape) {
    _applyAutoFitToLayer(selection, state.autoFitPadding, state.useScaling, state.scalingMin, state.autoShape, state.autoFit);
  }

  state.result = "";
}

function _alignTextLayerToSelection() {
  var state = _hostState.alignTextLayerToSelection;
  if (!documents.length) {
    state.result = "doc";
    return;
  } else if (!_layerIsTextLayer()) {
    state.result = "layer";
    return;
  }

  var selection = _checkSelection();
  if (selection.error) {
    if (selection.error === "noSelection") {
      _logDebug('[INFO] No selection, trying magic wand');
      _createMagicWandSelection(20);
      selection = _checkSelection();
    }
    if (selection.error) {
      _logDebug('[ERR] Align failed: ' + selection.error);
      state.result = selection.error;
      return;
    }
  }
  _logDebug('=== ALIGN ' + (state.resize ? '+Resize' : 'Move') + ' ===');
  _logDebug('[SEL] Selection: ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + 'px  Center: (' + Math.round(selection.xMid) + ',' + Math.round(selection.yMid) + ')');
  if (state.resize) {
    var wasPoint = _textLayerIsPointText();
    var width = selection.width;
    if (state.padding > 0) {
      width = Math.max(width - state.padding * 2, _MIN_TEXTBOX_WIDTH);
    }
    _logDebug('[INFO] Resize: boxW=' + Math.round(width) + 'px  padding=' + (state.padding || 0) + 'px  wasPoint=' + wasPoint);
    var height = selection.height * 15;
    _setTextBoxSize(width, height);
    var bounds = _getCurrentTextLayerBounds();
    if (!bounds) {
      _logDebug('[ERR] No layer bounds');
      state.result = "layer";
      return;
    }
    if (wasPoint) {
      _changeToPointText();
    } else {
      _resizeTextBoxToContent(width, bounds);
    }
    bounds = _getCurrentTextLayerBounds();
    if (!bounds) {
      _logDebug('[ERR] No layer bounds after resize');
      state.result = "layer";
      return;
    }
    _deselect();
    var offsetX = selection.xMid - bounds.xMid;
    var offsetY = selection.yMid - bounds.yMid;
    _moveLayer(offsetX, offsetY);
    _logDebug('[INFO] Aligned: offset=(' + Math.round(offsetX) + ',' + Math.round(offsetY) + ')');
  } else {
    var bounds = _getCurrentTextLayerBounds();
    if (!bounds) {
      _logDebug('[ERR] No layer bounds');
      state.result = "layer";
      return;
    }
    _deselect();
    var offsetX = selection.xMid - bounds.xMid;
    var offsetY = selection.yMid - bounds.yMid;
    _moveLayer(offsetX, offsetY);
    _logDebug('[INFO] Aligned: offset=(' + Math.round(offsetX) + ',' + Math.round(offsetY) + ')');
  }
  state.result = "";
}

function _changeActiveLayerTextSize() {
  var state = _hostState.changeActiveLayerTextSize;
  if (!documents.length) {
    state.result = "doc";
    return;
  } else if (!_layerIsTextLayer()) {
    state.result = "layer";
    return;
  } else if (!state.value) {
    state.result = "";
    return;
  }

  _forEachSelectedLayer(function () {
    try {
      var ref = new ActionReference();
      ref.putProperty(charID.Property, charID.TextStyle);
      ref.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);

      var currentTextStyle = executeActionGet(ref);
      if (currentTextStyle.hasKey(charID.TextStyle)) {
        var textStyle = currentTextStyle.getObjectValue(charID.TextStyle);
        var currentSize = textStyle.getDouble(charID.Size);
        var sizeUnit = textStyle.getUnitDoubleType(charID.Size);
        var newSize = currentSize + state.value;

        var descriptor = new ActionDescriptor();
        var reference = new ActionReference();
        reference.putProperty(charID.Property, charID.TextStyle);
        reference.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
        descriptor.putReference(charID.Null, reference);

        var newTextStyle = new ActionDescriptor();
        newTextStyle.putUnitDouble(charID.Size, sizeUnit, newSize);
        descriptor.putObject(charID.To, charID.TextStyle, newTextStyle);

        try {
          executeAction(charID.Set, descriptor, DialogModes.NO);
        } catch (setErr) { }
      }
    } catch (e) {
      var oldTextParams = jamText.getLayerText();
      var text = oldTextParams.layerText.textKey.replace(/\n+/g, "");
      if (!text) {
        state.result = "layer";
        return;
      }
      var oldBounds = _getCurrentTextLayerBounds();
      if (!oldBounds) return;
      var isPoint = _textLayerIsPointText();
      var newTextParams = {
        typeUnit: oldTextParams.typeUnit,
        layerText: {
          textKey: text,
          textGridding: oldTextParams.layerText.textGridding || "none",
          orientation: oldTextParams.layerText.orientation || "horizontal",
          antiAlias: oldTextParams.layerText.antiAlias || "antiAliasStrong",
          textStyleRange: [oldTextParams.layerText.textStyleRange[0]],
        },
      };
      if (oldTextParams.layerText.paragraphStyleRange) {
        var oldParStyle = oldTextParams.layerText.paragraphStyleRange[0].paragraphStyle;
        newTextParams.layerText.paragraphStyleRange = [oldTextParams.layerText.paragraphStyleRange[0]];
        newTextParams.layerText.paragraphStyleRange[0].paragraphStyle.textEveryLineComposer = oldParStyle.textEveryLineComposer || false;
        newTextParams.layerText.paragraphStyleRange[0].paragraphStyle.burasagari = oldParStyle.burasagari || "burasagariNone";
        newTextParams.layerText.paragraphStyleRange[0].to = text.length;
      }
      var oldSize = newTextParams.layerText.textStyleRange[0].textStyle.size;
      var newTextSize = oldSize + state.value;
      newTextParams.layerText.textStyleRange[0].textStyle.size = newTextSize;

      var textStyle = newTextParams.layerText.textStyleRange[0].textStyle;
      if (textStyle.autoLeading || textStyle.leading === undefined) {
        textStyle.autoLeading = true;
        delete textStyle.leading;
      } else {
        var oldLeading = textStyle.leading;
        var newLeading = oldLeading + state.value;
        textStyle.leading = newLeading;
        textStyle.autoLeading = false;
      }

      newTextParams.layerText.textStyleRange[0].to = text.length;
      if (!isPoint && state.value > 0) {
        newTextParams.layerText.textShape = [oldTextParams.layerText.textShape[0]];
        var shapeBounds = newTextParams.layerText.textShape[0].bounds;
        shapeBounds.bottom *= 1.12;
        shapeBounds.right *= 1.06;
      }
      try {
        jamText.setLayerText(newTextParams);
      } catch (e2) { return; }
      _applyMiddleEast(newTextParams.layerText.textStyleRange[0].textStyle);
      var newBounds = _getCurrentTextLayerBounds();
      var offsetX = oldBounds.xMid - newBounds.xMid;
      var offsetY = oldBounds.yMid - newBounds.yMid;
      _moveLayer(offsetX, offsetY);
    }
  });

  state.result = "";
}

function _changeSize_alt() {
  var increasing = _hostState.changeActiveLayerTextSize.value > 0;
  _forEachSelectedLayer(function () {
    var a = new ActionReference();
    a.putProperty(charID.Property, charID.Text);
    a.putEnumerated(charID.Layer, charID.Ordinal, charID.Target);
    var currentLayer = executeActionGet(a);
    if (currentLayer.hasKey(charID.Text)) {
      var settings = currentLayer.getObjectValue(charID.Text);
      var textStyleRange = settings.getList(charID.TextStyleRange);
      var sizes = [];
      var units = [];
      var proceed = true;
      for (var i = 0; i < textStyleRange.count; i++) {
        var style = textStyleRange.getObjectValue(i).getObjectValue(charID.TextStyle);
        sizes[i] = style.getDouble(charID.Size);
        units[i] = style.getUnitDoubleType(charID.Size);
        if (i > 0 && (sizes[i] !== sizes[i - 1] || units[i] !== units[i - 1])) {
          proceed = false;
          break;
        }
      }
      var amount = 0.2; // mm
      if (units[0] === charID.PixelUnit) amount = 1; // pixel
      else if (units[0] === 592473716) amount = 0.5; // point
      if (!increasing) amount *= -1;
      if (proceed) {
        var aa = new ActionDescriptor();
        var d = new ActionReference();
        d.putProperty(charID.Property, charID.TextStyle);
        d.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
        aa.putReference(charID.Null, d);
        var e = new ActionDescriptor();
        e.putUnitDouble(charID.Size, units[0], sizes[0] + amount);
        aa.putObject(charID.To, charID.TextStyle, e);
        try {
          executeAction(charID.Set, aa, DialogModes.NO);
        } catch (setErr) { }
      }
    }
  });
  _hostState.changeActiveLayerTextSize.result = "";
}

/* ======================================================== */
/* ==================== public methods ==================== */
/* ======================================================== */

function nativeAlert(data) {
  if (!data) return "";
  alert(data.text, data.title, data.isError);
}

function nativeConfirm(data) {
  if (!data) return "";
  var result = confirm(data.text, false, data.title);
  return result ? "1" : "";
}

function getUserFonts() {
  var fontsArr = [];
  for (var i = 0; i < app.fonts.length; i++) {
    var font = app.fonts[i];
    fontsArr.push({
      name: font.name,
      postScriptName: font.postScriptName,
      family: font.family,
      style: font.style,
    });
  }
  return jamJSON.stringify({
    fonts: fontsArr,
  });
}

function getHotkeyPressed() {
  var state = ScriptUI.environment.keyboardState;
  var string = "a";

  if (state.metaKey) {
    string += "WINa";
  }
  if (state.ctrlKey) {
    string += "CTRLa";
  }
  if (state.altKey) {
    string += "ALTa";
  }
  if (state.shiftKey) {
    string += "SHIFTa";
  }
  if (state.keyName) {
    string += state.keyName.toUpperCase() + "a";
  }
  return string;
}

function getActiveLayerText() {
  if (!documents.length) {
    return "";
  } else if (activeDocument.activeLayer.kind != LayerKind.TEXT) {
    return "";
  }
  return jamJSON.stringify({
    textProps: jamText.getLayerText(),
    stroke: _getLayerStroke(),
  });
}

function setActiveLayerText(data) {
  var state = _hostState.setActiveLayerText;
  state.data = data;
  state.result = "";
  _logDebug('[CALL] setActiveLayerText');
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TyperTools Change", "_setActiveLayerText()");
  } catch (e) {
    _logDebug('[ERR] suspendHistory error: ' + e);
    state.result = state.result || "layer";
  }
  _restoreDialogs(prev);
  return _returnWithLog(state.result);
}

function createTextLayerInSelection(data, point) {
  var state = _hostState.createTextLayerInSelection;
  state.data = data;
  state.point = point;
  state.padding = data.padding || 0;
  state.autoFit = !!data.autoFit;
  state.autoFitPadding = data.autoFitPadding || 13;
  state.useScaling = !!data.useScaling;
  state.scalingMin = data.scalingMin || 85;
  state.autoShape = !!data.autoShape;
  state.result = "";
  _logDebug('[CALL] createTextLayerInSelection  AF=' + !!data.autoFit + ' AS=' + !!data.autoShape + ' pad=' + (data.padding || 0));
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TyperTools Paste", "_createTextLayerInSelection()");
  } catch (e) {
    _logDebug('[ERR] suspendHistory error: ' + e);
    state.result = state.result || "noSelection";
  }
  _restoreDialogs(prev);
  return _returnWithLog(state.result);
}

function _createTextLayersInStoredSelections() {
  var state = _hostState.createTextLayersInStoredSelections;
  _logDebug('=== PASTE Multi (' + ((state.selections || []).length) + ' bubbles) ===');
  if (!documents.length) {
    _logDebug('[ERR] No document open');
    state.result = "doc";
    return;
  }
  
  if (!state.selections || state.selections.length === 0) {
    _logDebug('[ERR] No selections stored');
    state.result = "noSelection";
    return;
  }
  
  var texts = state.data.texts || [];
  var styles = state.data.styles || [];
  var richTextRunsList = state.data.richTextRuns || [];
  
  if (texts.length === 0) {
    state.result = "noSelection";
    return;
  }
  
  var maxCount = Math.min(texts.length, state.selections.length);
  
  for (var i = 0; i < maxCount; i++) {
    var text = texts[i] || texts[texts.length - 1] || "";
    var style = styles[i] || styles[styles.length - 1] || { textProps: _getHostDefaultStyle(), stroke: _getLayerStroke() };
    var richTextRuns = richTextRunsList[i] || null;
    var storedSel = state.selections[i];
    
    if (!text) continue;
    if (storedSel.width < 20 || storedSel.height < 20) continue;
    _logDebug('========================================');
    _logDebug('--- Bubble[' + (i+1) + '/' + maxCount + '] "' + (text.length > 80 ? text.slice(0,80) + '...' : text) + '" ---');
    _logDebug('[SEL] Stored: ' + Math.round(storedSel.width) + 'x' + Math.round(storedSel.height) + 'px  Center: (' + Math.round(storedSel.xMid) + ',' + Math.round(storedSel.yMid) + ')');

    _magicWandAtPoint(storedSel.xMid, storedSel.yMid, 20);
    var selection = _checkSelection();
    if (selection.error) {
      selection = storedSel;
      _logDebug('[SEL] Magic wand failed, using stored bounds');
    } else {
      var dxMid = Math.abs(selection.xMid - storedSel.xMid);
      var dyMid = Math.abs(selection.yMid - storedSel.yMid);
      var wRatio = selection.width / storedSel.width;
      var hRatio = selection.height / storedSel.height;
      if (dxMid > storedSel.width * 0.3 || dyMid > storedSel.height * 0.3 || wRatio > 1.4 || hRatio > 1.4 || wRatio < 0.6 || hRatio < 0.6) {
        selection = storedSel;
        _logDebug('[SEL] Magic wand result too different, using stored bounds');
      } else {
        _logDebug('[SEL] Refined: ' + Math.round(selection.width) + 'x' + Math.round(selection.height) + 'px  Center: (' + Math.round(selection.xMid) + ',' + Math.round(selection.yMid) + ')');
      }
    }
    
    var scale = _DEFAULT_SELECTION_SCALE;
    var width = selection.width * scale;
    if (state.padding > 0) {
      width = Math.max(width - state.padding * 2, _MIN_TEXTBOX_WIDTH);
    }
    var height = selection.height * 15;
    
    var data = { text: text, style: style, richTextRuns: richTextRuns, direction: state.data.direction };
    _createAndSetLayerText(data, width, height);
    
    var bounds = _getCurrentTextLayerBounds();
    if (!bounds) continue;
    if (state.point) {
      _changeToPointText();
    } else {
      _resizeTextBoxToContent(width, bounds);
    }
    bounds = _getCurrentTextLayerBounds();
    if (!bounds) continue;
    var offsetX = selection.xMid - bounds.xMid;
    var offsetY = selection.yMid - bounds.yMid;
    _moveLayer(offsetX, offsetY);

    if (state.autoFit || state.autoShape) {
      _applyAutoFitToLayer(selection, state.autoFitPadding, state.useScaling, state.scalingMin, state.autoShape, state.autoFit);
    }
  }
  
  state.selections = [];
  state.result = "";
}

function createTextLayersInStoredSelections(data, point) {
  var state = _hostState.createTextLayersInStoredSelections;
  state.data = data;
  state.point = point;
  state.padding = data.padding || 0;
  state.autoFit = !!data.autoFit;
  state.autoFitPadding = data.autoFitPadding || 13;
  state.useScaling = !!data.useScaling;
  state.scalingMin = data.scalingMin || 85;
  state.autoShape = !!data.autoShape;
  state.result = "";
  
  if (data && data.selections) {
    state.selections = data.selections;
  } else {
    state.selections = [];
  }
  
  _logDebug('[CALL] createTextLayersInStoredSelections  count=' + (state.selections.length) + '  AF=' + !!data.autoFit + ' AS=' + !!data.autoShape);
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TyperTools Multiple Paste", "_createTextLayersInStoredSelections()");
  } catch (e) { state.result = state.result || "noSelection"; }
  _restoreDialogs(prev);
  return _returnWithLog(state.result);
}

function alignTextLayerToSelection(data) {
  var state = _hostState.alignTextLayerToSelection;
  state.resize = !!data.resizeTextBox;
  state.padding = data.padding || 0;
  state.result = "";
  _logDebug('[CALL] alignTextLayerToSelection  resize=' + state.resize + ' pad=' + state.padding);
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TyperTools Align", "_alignTextLayerToSelection()");
  } catch (e) {
    _logDebug('[ERR] suspendHistory error: ' + e);
    state.result = state.result || "layer";
  }
  _restoreDialogs(prev);
  return _returnWithLog(state.result);
}

function changeActiveLayerTextSize(val) {
  var state = _hostState.changeActiveLayerTextSize;
  state.value = val;
  state.result = "";
  _logDebug('[CALL] changeActiveLayerTextSize  val=' + val);
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TyperTools Resize", "_changeActiveLayerTextSize()");
  } catch (e) {
    _logDebug('[ERR] suspendHistory error: ' + e);
    state.result = state.result || "layer";
  }
  _restoreDialogs(prev);
  return _returnWithLog(state.result);
}

function _getAccurateBoundsAtSize(size, leadingRatio) {
  try {
    var setDesc = new ActionDescriptor();
    var setRef = new ActionReference();
    setRef.putProperty(charID.Property, charID.TextStyle);
    setRef.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    setDesc.putReference(charID.Null, setRef);
    var newStyle = new ActionDescriptor();
    newStyle.putUnitDouble(charID.Size, stringIDToTypeID("pointsUnit"), size);
    var leading = size * (leadingRatio || 1.2);
    newStyle.putUnitDouble(stringIDToTypeID("leading"), stringIDToTypeID("pointsUnit"), leading);
    setDesc.putObject(charID.To, charID.TextStyle, newStyle);
    executeAction(charID.Set, setDesc, DialogModes.NO);

    return _getCurrentTextLayerBounds();
  } catch (e) {
    return null;
  }
}

function _findOptimalFontSize(maxWidth, maxHeight, minSize, maxSize, leadingRatio) {
  if (!minSize) minSize = 6;
  if (!maxSize) maxSize = 72;
  var bestSize = minSize;
  var low = minSize;
  var high = maxSize;

  while (high - low > 0.5) {
    var mid = (low + high) / 2;
    var bounds = _getAccurateBoundsAtSize(mid, leadingRatio);

    if (!bounds || bounds.width <= 0) {
      high = mid;
      continue;
    }

    if (bounds.width <= maxWidth && bounds.height <= maxHeight) {
      bestSize = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor(bestSize * 10) / 10;
}

function _getOriginalTextSize() {
  try {
    var ref = new ActionReference();
    ref.putProperty(charID.Property, charID.TextStyle);
    ref.putEnumerated(charID.TextLayer, charID.Ordinal, charID.Target);
    var desc = executeActionGet(ref);
    if (desc.hasKey(charID.TextStyle)) {
      var style = desc.getObjectValue(charID.TextStyle);
      var size = style.getDouble(charID.Size);
      var leadingId = stringIDToTypeID("leading");
      var leading = style.hasKey(leadingId) ? style.getDouble(leadingId) : size * 1.2;
      return { size: size, leading: leading, ratio: leading / size };
    }
  } catch (e) { _logDebug("error: " + e); }
  return { size: 20, leading: 24, ratio: 1.2 };
}

function _autoFitTextInSelection() {
  var state = _hostState.autoFit;
  if (!documents.length) {
    state.result = "doc";
    return;
  }
  if (!_layerIsTextLayer()) {
    state.result = "layer";
    return;
  }

  var selection = _checkSelection();
  if (selection.error) {
    state.result = selection.error;
    return;
  }

  _applyAutoFitToLayer(selection, state.padding, state.useScaling, state.scalingMin, state.autoShape, true);

  state.result = "";
}

function autoFitTextInSelection(padding, useScaling, scalingMin, autoShape) {
  _hostState.autoFit = { padding: padding || 10, useScaling: !!useScaling, scalingMin: scalingMin || 85, autoShape: !!autoShape, result: "" };
  _logDebug('[CALL] autoFitTextInSelection  pad=' + (padding || 10) + ' scaling=' + !!useScaling + ' min=' + (scalingMin || 85) + ' AS=' + !!autoShape);
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TypeR AutoFit", "_autoFitTextInSelection()");
  } catch (e) {
    _logDebug('[ERR] suspendHistory error: ' + e);
    _hostState.autoFit.result = _hostState.autoFit.result || "layer";
  }
  _restoreDialogs(prev);
  return _returnWithLog(_hostState.autoFit.result);
}

function addInverseStroke() {
  if (!documents.length) return "doc";
  if (!_layerIsTextLayer()) return "layer";
  _logDebug('[CALL] addInverseStroke');
  var prev = _suppressDialogs();
  try {
    app.activeDocument.suspendHistory("TypeR Stroke", "_addInverseStrokeAll()");
  } catch (e) { _logDebug('[ERR] addInverseStroke: ' + e); }
  _restoreDialogs(prev);
  return _returnWithLog('');
}

function _addInverseStrokeAll() {
  _forEachSelectedLayer(function () {
    _addInverseStrokeToLayer();
  });
}

function getCurrentSelection() {
  if (!documents.length) {
    return jamJSON.stringify({ error: "doc" });
  }
  var prev = _suppressDialogs();
  var selection = _checkSelection();
  _restoreDialogs(prev);
  if (selection.error) {
    return jamJSON.stringify({ error: selection.error });
  }
  return jamJSON.stringify(selection);
}

function startSelectionMonitoring() {
  var monitor = _hostState.selectionMonitor;
  // Make sure to remove any leftover notifier from previous sessions
  if (monitor.callback) {
    app.removeNotifier("Slct", monitor.callback);
    monitor.callback = null;
  }
}

function stopSelectionMonitoring() {
  var monitor = _hostState.selectionMonitor;
  if (monitor.callback) {
    app.removeNotifier("Slct", monitor.callback);
    monitor.callback = null;
  }
  monitor.lastBounds = null;
}

function getSelectionChanged() {
  var prev = _suppressDialogs();
  try {
    var monitor = _hostState.selectionMonitor;
    var keyboardState = ScriptUI.environment && ScriptUI.environment.keyboardState;
    var shiftPressed = !!(keyboardState && keyboardState.shiftKey);

    // Fast check: just get raw bounding box extremeties to see if anything changed.
    var rawSelection = _getMultiSelectionBounds();
    if (!rawSelection) {
      if (monitor.lastBounds) {
        monitor.lastBounds = null;
        _restoreDialogs(prev);
        return jamJSON.stringify({ selectionRemoved: true, shiftKey: shiftPressed });
      }
      _restoreDialogs(prev);
      return jamJSON.stringify({ noChange: true, shiftKey: shiftPressed });
    }

    var selectionArray = Object.prototype.toString.call(rawSelection) === '[object Array]' ? rawSelection : [rawSelection];

    var groups = [];
    for (var i = 0; i < selectionArray.length; i++) {
      if (selectionArray[i].width < 2 && selectionArray[i].height < 2) continue;
      groups.push([selectionArray[i]]);
    }

    var changed = true;
    var margin = 30; // 30 pixels tolerance to merge nearby pixel specks into the main bubble
    while (changed) {
      changed = false;
      for (var i = 0; i < groups.length; i++) {
        for (var j = i + 1; j < groups.length; j++) {
          var overlap = false;
          for (var m = 0; m < groups[i].length; m++) {
            for (var n = 0; n < groups[j].length; n++) {
              var b1 = groups[i][m];
              var b2 = groups[j][n];
              if (!(b1.right + margin < b2.left - margin ||
                b1.left - margin > b2.right + margin ||
                b1.bottom + margin < b2.top - margin ||
                b1.top - margin > b2.bottom + margin)) {
                overlap = true;
                break;
              }
            }
            if (overlap) break;
          }

          if (overlap) {
            groups[i] = groups[i].concat(groups[j]);
            groups.splice(j, 1);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    var merged = [];
    for (var k = 0; k < groups.length; k++) {
      var g = groups[k];
      var minLeft = 99999, minTop = 99999, maxRight = -99999, maxBottom = -99999;
      for (var m = 0; m < g.length; m++) {
        if (g[m].left < minLeft) minLeft = g[m].left;
        if (g[m].top < minTop) minTop = g[m].top;
        if (g[m].right > maxRight) maxRight = g[m].right;
        if (g[m].bottom > maxBottom) maxBottom = g[m].bottom;
      }
      var w = maxRight - minLeft;
      var h = maxBottom - minTop;
      if (w > 2 && h > 2) {
        merged.push({
          top: minTop, left: minLeft, right: maxRight, bottom: maxBottom,
          width: w, height: h,
          xMid: (minLeft + maxRight) / 2, yMid: (minTop + maxBottom) / 2
        });
      }
    }

    if (merged.length === 0) {
      _restoreDialogs(prev);
      return jamJSON.stringify({ noChange: true, shiftKey: shiftPressed });
    }

    var isSame = false;
    if (monitor.lastBounds && merged.length === 1) {
      var diffTop = Math.abs(merged[0].top - monitor.lastBounds.top);
      var diffLeft = Math.abs(merged[0].left - monitor.lastBounds.left);
      var diffRight = Math.abs(merged[0].right - monitor.lastBounds.right);
      var diffBottom = Math.abs(merged[0].bottom - monitor.lastBounds.bottom);
      if (diffTop <= 5 && diffLeft <= 5 && diffRight <= 5 && diffBottom <= 5) {
        isSame = true;
      }
    }

    if (isSame && !shiftPressed) {
      _restoreDialogs(prev);
      return jamJSON.stringify({ noChange: true, shiftKey: shiftPressed });
    }

    monitor.lastBounds = merged[0]; // just store first to prevent re-trigger

    var multiResults = [];
    for (var k = 0; k < merged.length; k++) {
      var mbnd = merged[k];
      multiResults.push({
        shiftKey: shiftPressed,
        top: mbnd.top, left: mbnd.left, right: mbnd.right, bottom: mbnd.bottom,
        width: mbnd.width, height: mbnd.height,
        xMid: mbnd.xMid, yMid: mbnd.yMid
      });
    }

    var payload = {
      multiSelection: multiResults,
      shiftKey: shiftPressed,
      top: merged[0].top, left: merged[0].left, right: merged[0].right, bottom: merged[0].bottom,
      width: merged[0].width, height: merged[0].height, xMid: merged[0].xMid, yMid: merged[0].yMid
    };
    return jamJSON.stringify(payload);
  } catch (e) {
    _restoreDialogs(prev);
    return jamJSON.stringify({ error: true, message: "getSelectionChanged inner error: " + e.message + " on line " + e.line, shiftKey: false });
  }
  _restoreDialogs(prev);
}

function getSelectionPixelsAsBase64() {
  _logDebug('[AI_CLEAN] getSelectionPixelsAsBase64 called');
  var prev = _suppressDialogs();
  try {
    if (!documents.length) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noDocument');
    }
    var bounds = _getCurrentSelectionBounds();
    if (!bounds) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noSelection');
    }
    var left = Math.round(bounds.left);
    var top = Math.round(bounds.top);
    var right = Math.round(bounds.right);
    var bottom = Math.round(bounds.bottom);
    var w = right - left;
    var h = bottom - top;
    if (w < 5 || h < 5) {
      _restoreDialogs(prev);
      return _returnWithLog('error:smallSelection');
    }
    _logDebug('[AI_CLEAN] Selection bounds: ' + left + ',' + top + ' ' + w + 'x' + h);

    var doc = activeDocument;
    var docName = doc.name;

    var dupDesc = new ActionDescriptor();
    var dupRef = new ActionReference();
    dupRef.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    dupDesc.putReference(charIDToTypeID("null"), dupRef);
    dupDesc.putString(charIDToTypeID("Nm  "), "TypeR_AI_Temp");
    executeAction(charIDToTypeID("Dplc"), dupDesc, DialogModes.NO);
    _logDebug('[AI_CLEAN] Document duplicated');

    var tempDoc = app.activeDocument;
    tempDoc.flatten();
    _logDebug('[AI_CLEAN] Flattened');

    var cropRegion = [new UnitValue(left, 'px'), new UnitValue(top, 'px'), new UnitValue(right, 'px'), new UnitValue(bottom, 'px')];
    tempDoc.crop(cropRegion);
    _logDebug('[AI_CLEAN] Cropped to selection');

    var maxDim = 1500;
    if (w > maxDim || h > maxDim) {
      var scale = Math.min(maxDim / w, maxDim / h) * 100;
      tempDoc.resizeImage(UnitValue(w * scale / 100, "px"), UnitValue(h * scale / 100, "px"), doc.resolution, ResampleMethod.BICUBIC);
      _logDebug('[AI_CLEAN] Resized to ' + Math.round(w * scale / 100) + 'x' + Math.round(h * scale / 100));
    }

    var tempFolder = Folder.temp;
    var tempFile = new File(tempFolder.fsName + '/typer_ai_clean_temp.jpg');
    var jpgOpts = new JPEGSaveOptions();
    jpgOpts.quality = 12;
    jpgOpts.embedColorProfile = false;
    jpgOpts.formatOptions = FormatOptions.STANDARDBASELINE;
    tempDoc.saveAs(tempFile, jpgOpts, true, Extension.LOWERCASE);
    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;
    _logDebug('[AI_CLEAN] Saved JPEG: ' + tempFile.fsName + ' size=' + tempFile.length);

    var result = {
      filePath: tempFile.fsName,
      mimeType: 'image/jpeg',
      width: w,
      height: h,
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      resolution: doc.resolution
    };
    _restoreDialogs(prev);
    return _returnWithLog(jamJSON.stringify(result));
  } catch (e) {
    _logDebug('[AI_CLEAN] Error: ' + e.message + ' line ' + e.line);
    _restoreDialogs(prev);
    return _returnWithLog('error:' + e.message);
  }
}

function getSelectionForLamaClean(contextPadding) {
  _logDebug('[LAMA_CLEAN] getSelectionForLamaClean called, padding=' + contextPadding);
  var prev = _suppressDialogs();
  try {
    if (!documents.length) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noDocument');
    }
    var bounds = _getCurrentSelectionBounds();
    if (!bounds) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noSelection');
    }
    var selLeft = Math.round(bounds.left);
    var selTop = Math.round(bounds.top);
    var selRight = Math.round(bounds.right);
    var selBottom = Math.round(bounds.bottom);
    var selW = selRight - selLeft;
    var selH = selBottom - selTop;
    if (selW < 5 || selH < 5) {
      _restoreDialogs(prev);
      return _returnWithLog('error:smallSelection');
    }
    _logDebug('[LAMA_CLEAN] Selection: ' + selLeft + ',' + selTop + ' ' + selW + 'x' + selH);

    var doc = activeDocument;
    var docW = Math.round(doc.width.as('px'));
    var docH = Math.round(doc.height.as('px'));
    var pad = contextPadding || Math.round(Math.max(selW, selH) * 0.35);
    pad = Math.max(pad, 30);

    var cropLeft = Math.max(0, selLeft - pad);
    var cropTop = Math.max(0, selTop - pad);
    var cropRight = Math.min(docW, selRight + pad);
    var cropBottom = Math.min(docH, selBottom + pad);
    var cropW = cropRight - cropLeft;
    var cropH = cropBottom - cropTop;

    var maskLeft = selLeft - cropLeft;
    var maskTop = selTop - cropTop;
    var maskRight = maskLeft + selW;
    var maskBottom = maskTop + selH;

    _logDebug('[LAMA_CLEAN] Crop area: ' + cropLeft + ',' + cropTop + ' ' + cropW + 'x' + cropH);
    _logDebug('[LAMA_CLEAN] Mask area in crop: ' + maskLeft + ',' + maskTop + ' to ' + maskRight + ',' + maskBottom);

    var dupDesc = new ActionDescriptor();
    var dupRef = new ActionReference();
    dupRef.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    dupDesc.putReference(charIDToTypeID("null"), dupRef);
    dupDesc.putString(charIDToTypeID("Nm  "), "TypeR_Lama_Temp");
    executeAction(charIDToTypeID("Dplc"), dupDesc, DialogModes.NO);

    var tempDoc = app.activeDocument;
    tempDoc.flatten();

    var cropRegion = [
      new UnitValue(cropLeft, 'px'), new UnitValue(cropTop, 'px'),
      new UnitValue(cropRight, 'px'), new UnitValue(cropBottom, 'px')
    ];
    tempDoc.crop(cropRegion);
    _logDebug('[LAMA_CLEAN] Cropped with context padding');

    var tempFolder = Folder.temp;
    var inputFile = new File(tempFolder.fsName + '/typer_lama_input.png');
    var pngOpts = new PNGSaveOptions();
    pngOpts.compression = 6;
    pngOpts.interlaced = false;
    tempDoc.saveAs(inputFile, pngOpts, true, Extension.LOWERCASE);
    _logDebug('[LAMA_CLEAN] Saved input: ' + inputFile.fsName);

    tempDoc.selection.selectAll();
    var fillColor = new SolidColor();
    fillColor.rgb.red = 0;
    fillColor.rgb.green = 0;
    fillColor.rgb.blue = 0;
    tempDoc.selection.fill(fillColor, ColorBlendMode.NORMAL, 100, false);

    var selRegion = [
      [maskLeft, maskTop],
      [maskRight, maskTop],
      [maskRight, maskBottom],
      [maskLeft, maskBottom]
    ];
    tempDoc.selection.select(selRegion);
    var whiteFill = new SolidColor();
    whiteFill.rgb.red = 255;
    whiteFill.rgb.green = 255;
    whiteFill.rgb.blue = 255;
    tempDoc.selection.fill(whiteFill, ColorBlendMode.NORMAL, 100, false);
    tempDoc.selection.deselect();

    var maskFile = new File(tempFolder.fsName + '/typer_lama_mask.png');
    tempDoc.saveAs(maskFile, pngOpts, true, Extension.LOWERCASE);
    _logDebug('[LAMA_CLEAN] Saved mask: ' + maskFile.fsName);

    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;

    var result = {
      inputPath: inputFile.fsName,
      maskPath: maskFile.fsName,
      selLeft: selLeft,
      selTop: selTop,
      selWidth: selW,
      selHeight: selH,
      cropLeft: cropLeft,
      cropTop: cropTop,
      cropWidth: cropW,
      cropHeight: cropH,
      maskOffsetLeft: maskLeft,
      maskOffsetTop: maskTop
    };
    _restoreDialogs(prev);
    return _returnWithLog(jamJSON.stringify(result));
  } catch (e) {
    _logDebug('[LAMA_CLEAN] Error: ' + e.message + ' line ' + e.line);
    try { _restoreDialogs(prev); } catch(re) {}
    return _returnWithLog('error:' + e.message);
  }
}

function applyLamaCleanResult(imgFilePath, cropLeft, cropTop, maskOffsetLeft, maskOffsetTop, selWidth, selHeight) {
  _logDebug('[LAMA_CLEAN] applyLamaCleanResult called');
  var prev = _suppressDialogs();
  try {
    if (!documents.length) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noDocument');
    }
    var doc = activeDocument;
    var docName = doc.name;

    var imgFile = new File(imgFilePath);
    if (!imgFile.exists) {
      _logDebug('[LAMA_CLEAN] Output file NOT found: ' + imgFilePath);
      _restoreDialogs(prev);
      return _returnWithLog('error:imageFileNotFound');
    }

    app.open(imgFile);
    var resultDoc = app.activeDocument;
    _logDebug('[LAMA_CLEAN] Opened result: ' + resultDoc.width.as('px') + 'x' + resultDoc.height.as('px'));

    var cropSelLeft = maskOffsetLeft;
    var cropSelTop = maskOffsetTop;
    var cropSelRight = maskOffsetLeft + selWidth;
    var cropSelBottom = maskOffsetTop + selHeight;
    var cropRegion = [
      new UnitValue(cropSelLeft, 'px'), new UnitValue(cropSelTop, 'px'),
      new UnitValue(cropSelRight, 'px'), new UnitValue(cropSelBottom, 'px')
    ];
    resultDoc.crop(cropRegion);
    _logDebug('[LAMA_CLEAN] Cropped result to selection area');

    try {
      if (resultDoc.activeLayer.isBackgroundLayer) {
        resultDoc.activeLayer.isBackgroundLayer = false;
      }
    } catch(u) {}

    var dupDesc = new ActionDescriptor();
    var dupRef = new ActionReference();
    dupRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    dupDesc.putReference(charIDToTypeID("null"), dupRef);
    var targetRef = new ActionReference();
    targetRef.putName(charIDToTypeID("Dcmn"), docName);
    dupDesc.putReference(charIDToTypeID("T   "), targetRef);
    dupDesc.putString(charIDToTypeID("Nm  "), "LaMa Clean");
    executeAction(charIDToTypeID("Dplc"), dupDesc, DialogModes.NO);

    resultDoc.close(SaveOptions.DONOTSAVECHANGES);
    imgFile.remove();

    app.activeDocument = doc;

    var targetLeft = cropLeft + maskOffsetLeft;
    var targetTop = cropTop + maskOffsetTop;
    var layerBounds = doc.activeLayer.bounds;
    var curLeft = layerBounds[0].as('px');
    var curTop = layerBounds[1].as('px');
    var offsetX = targetLeft - curLeft;
    var offsetY = targetTop - curTop;
    _logDebug('[LAMA_CLEAN] Layer at ' + curLeft + ',' + curTop + ' target=' + targetLeft + ',' + targetTop);
    if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
      doc.activeLayer.translate(new UnitValue(offsetX, 'px'), new UnitValue(offsetY, 'px'));
    }

    _logDebug('[LAMA_CLEAN] DONE - Result applied');
    _restoreDialogs(prev);
    return _returnWithLog('ok');
  } catch (e) {
    _logDebug('[LAMA_CLEAN] ERROR: ' + e.message + ' line ' + e.line);
    try { _restoreDialogs(prev); } catch(re) {}
    return _returnWithLog('error:' + e.message);
  }
}

function exportDocumentForDetection() {
  _logDebug('[AUTO_CLEAN] exportDocumentForDetection called');
  var prev = _suppressDialogs();
  try {
    if (!documents.length) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noDocument');
    }
    var doc = activeDocument;
    var docW = Math.round(doc.width.as('px'));
    var docH = Math.round(doc.height.as('px'));

    var dupDesc = new ActionDescriptor();
    var dupRef = new ActionReference();
    dupRef.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    dupDesc.putReference(charIDToTypeID("null"), dupRef);
    dupDesc.putString(charIDToTypeID("Nm  "), "TypeR_Det_Temp");
    executeAction(charIDToTypeID("Dplc"), dupDesc, DialogModes.NO);

    var tempDoc = app.activeDocument;
    tempDoc.flatten();

    var tempFolder = Folder.temp;
    var outFile = new File(tempFolder.fsName + '/typer_detect_input.png');
    var pngOpts = new PNGSaveOptions();
    pngOpts.compression = 6;
    pngOpts.interlaced = false;
    tempDoc.saveAs(outFile, pngOpts, true, Extension.LOWERCASE);
    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = doc;

    var result = {
      filePath: outFile.fsName,
      width: docW,
      height: docH
    };
    _restoreDialogs(prev);
    return _returnWithLog(jamJSON.stringify(result));
  } catch (e) {
    _logDebug('[AUTO_CLEAN] exportDocumentForDetection error: ' + e.message);
    try { _restoreDialogs(prev); } catch(re) {}
    return _returnWithLog('error:' + e.message);
  }
}

function createSelectionFromBounds(left, top, right, bottom) {
  _logDebug('[AUTO_CLEAN] createSelectionFromBounds: ' + left + ',' + top + ' -> ' + right + ',' + bottom);
  var prev = _suppressDialogs();
  try {
    if (!documents.length) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noDocument');
    }
    var doc = activeDocument;
    var selRegion = [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom]
    ];
    doc.selection.select(selRegion);
    _restoreDialogs(prev);
    return _returnWithLog('ok');
  } catch (e) {
    _logDebug('[AUTO_CLEAN] createSelectionFromBounds error: ' + e.message);
    try { _restoreDialogs(prev); } catch(re) {}
    return _returnWithLog('error:' + e.message);
  }
}

function applyAiCleanResult(imgFilePath, left, top, width, height) {
  _logDebug('[AI_CLEAN] applyAiCleanResult called');
  _logDebug('[AI_CLEAN] Image file: ' + imgFilePath);
  _logDebug('[AI_CLEAN] Position: left=' + left + ' top=' + top + ' w=' + width + ' h=' + height);
  var prev = _suppressDialogs();
  try {
    if (!documents.length) {
      _restoreDialogs(prev);
      return _returnWithLog('error:noDocument');
    }
    var doc = activeDocument;
    var docName = doc.name;

    var imgFile = new File(imgFilePath);
    if (!imgFile.exists) {
      _logDebug('[AI_CLEAN] Image file NOT found: ' + imgFilePath);
      _restoreDialogs(prev);
      return _returnWithLog('error:imageFileNotFound');
    }
    _logDebug('[AI_CLEAN] File exists, size=' + imgFile.length + ' bytes');

    _logDebug('[AI_CLEAN] Opening image in PS...');
    app.open(imgFile);
    var resultDoc = app.activeDocument;
    _logDebug('[AI_CLEAN] Opened: ' + resultDoc.width.as('px') + 'x' + resultDoc.height.as('px'));

    try {
      if (resultDoc.activeLayer.isBackgroundLayer) {
        resultDoc.activeLayer.isBackgroundLayer = false;
      }
    } catch(u) {}

    _logDebug('[AI_CLEAN] Duplicating layer to: ' + docName);
    var dupDesc = new ActionDescriptor();
    var dupRef = new ActionReference();
    dupRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    dupDesc.putReference(charIDToTypeID("null"), dupRef);
    var targetRef = new ActionReference();
    targetRef.putName(charIDToTypeID("Dcmn"), docName);
    dupDesc.putReference(charIDToTypeID("T   "), targetRef);
    dupDesc.putString(charIDToTypeID("Nm  "), "AI Clean");
    executeAction(charIDToTypeID("Dplc"), dupDesc, DialogModes.NO);
    _logDebug('[AI_CLEAN] Layer duplicated');

    resultDoc.close(SaveOptions.DONOTSAVECHANGES);
    imgFile.remove();

    app.activeDocument = doc;

    var layerBounds = doc.activeLayer.bounds;
    var curLeft = layerBounds[0].as('px');
    var curTop = layerBounds[1].as('px');
    var offsetX = left - curLeft;
    var offsetY = top - curTop;
    _logDebug('[AI_CLEAN] Layer at ' + curLeft + ',' + curTop + '  offset=' + offsetX.toFixed(1) + ',' + offsetY.toFixed(1));
    if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
      doc.activeLayer.translate(new UnitValue(offsetX, 'px'), new UnitValue(offsetY, 'px'));
    }

    _logDebug('[AI_CLEAN] DONE - Result applied at ' + left + ',' + top);
    _restoreDialogs(prev);
    return _returnWithLog('ok');
  } catch (e) {
    _logDebug('[AI_CLEAN] ERROR: ' + e.message + ' line ' + e.line);
    try { _restoreDialogs(prev); } catch(re) {}
    return _returnWithLog('error:' + e.message);
  }
}
