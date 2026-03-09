import _ from "lodash";

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

export function resolveStyleForLine(targetLine, selection, styles, currentStyle) {
  const prefixStyle = targetLine?.style || null;

  if (selection?.styleId && prefixStyle) {
    if (selection.styleId !== prefixStyle.id) {
      const storedStyle = (styles || []).find((s) => s.id === selection.styleId);
      if (storedStyle) return storedStyle;
    }
  }

  if (prefixStyle) {
    return prefixStyle;
  }

  if (selection?.styleId) {
    const storedStyle = (styles || []).find((s) => s.id === selection.styleId);
    if (storedStyle) return storedStyle;
  }

  return currentStyle;
}

export function resolveLineForSelection(selection, lines, nextFallbackIndexRef) {
  if (typeof selection.lineIndex === "number" && selection.lineIndex >= 0) {
    const storedLine = lines[selection.lineIndex];
    if (storedLine && !storedLine.ignore) {
      nextFallbackIndexRef.current = Math.max(nextFallbackIndexRef.current, selection.lineIndex + 1);
      return storedLine;
    }
  }

  while (nextFallbackIndexRef.current < lines.length) {
    const candidate = lines[nextFallbackIndexRef.current];
    nextFallbackIndexRef.current++;
    if (candidate && !candidate.ignore) {
      return candidate;
    }
  }
  return null;
}

export function applyTextScale(style, textScale) {
  if (!style || !textScale) return style;
  const scaled = _.cloneDeep(style);
  const txtStyle = scaled.textProps?.layerText?.textStyleRange?.[0]?.textStyle || {};
  if (typeof txtStyle.size === "number") {
    txtStyle.size *= textScale / 100;
  }
  if (typeof txtStyle.leading === "number" && txtStyle.leading) {
    txtStyle.leading *= textScale / 100;
  }
  return scaled;
}
