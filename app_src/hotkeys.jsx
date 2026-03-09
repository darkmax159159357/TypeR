import React from "react";

import { csInterface, setActiveLayerText, createTextLayerInSelection, createTextLayersInStoredSelections, alignTextLayerToSelection, getHotkeyPressed, changeActiveLayerTextSize, autoFitText, addInverseStroke, getCurrentSelection } from "./utils";
import { useContext } from "./context";
import { resolveStyleForLine, resolveLineForSelection, applyTextScale } from "./styleHelpers";

const CTRL = "CTRL";
const SHIFT = "SHIFT";
const ALT = "ALT";
const WIN = "WIN";

const intervalTime = 50;
let keyboardInterval = 0;
let keyUp = true;
let lastAction = 0;

const checkRepeatTime = (time = 0) => {
  const now = Date.now();
  if (!keyUp || now - lastAction < time) return false;
  lastAction = now;
  keyUp = false;
  return true;
};

const checkShortcut = (state, ref) => {
  return ref.every((key) => state.includes(key));
};

const HotkeysListner = React.memo(function HotkeysListner() {
  const context = useContext();
  const contextRef = React.useRef(context);
  contextRef.current = context;

  const hkLog = (prefix, log) => {
    var now = new Date();
    var p = function(n) { return (n < 10 ? '0' : '') + n; };
    var ts = now.getFullYear() + '-' + p(now.getMonth()+1) + '-' + p(now.getDate()) + ' ' + p(now.getHours()) + ':' + p(now.getMinutes()) + ':' + p(now.getSeconds());
    var header = '--- [' + ts + '] ' + (prefix || 'HK') + ' ---';
    var entry = header + '\n' + (log || '(no log from host)');
    contextRef.current.dispatch({ type: "appendDebugLog", value: entry });
  };

  React.useEffect(() => {
    const keyInterests = [{ keyCode: 27 }];
    csInterface.registerKeyEventsInterest(JSON.stringify(keyInterests));
  }, []);

  React.useEffect(() => {
    const checkState = (state) => {
      const ctx = contextRef.current;
      const realState = state.split("a");
      realState.shift();
      realState.pop();
      if (checkShortcut(realState, ctx.state.shortcut.add)) {
        if (!checkRepeatTime()) return;

        const storedSelections = ctx.state.storedSelections || [];

        if (ctx.state.multiBubbleMode && storedSelections.length > 0) {
          const texts = [];
          const styles = [];
          const matchedSelections = [];
          const lines = ctx.state.lines || [];
          const nextFallbackIndexRef = { current: ctx.state.currentLineIndex };

          for (let i = 0; i < storedSelections.length; i++) {
            const selection = storedSelections[i];
            const targetLine = resolveLineForSelection(selection, lines, nextFallbackIndexRef);
            if (!targetLine) {
              continue;
            }

            texts.push(targetLine.text);
            matchedSelections.push(selection);

            let lineStyle = resolveStyleForLine(targetLine, selection, ctx.state.styles, ctx.state.currentStyle);
            lineStyle = applyTextScale(lineStyle, ctx.state.textScale);
            styles.push(lineStyle);
          }

          const pointText = ctx.state.pastePointText;
          const padding = ctx.state.internalPadding || 0;
          const fitOpts = { autoFit: ctx.state.autoFitOnPaste, autoFitPadding: ctx.state.autoFitPadding || 13, useScaling: !!ctx.state.autoFitScaling, scalingMin: ctx.state.autoFitScalingMin || 85, autoShape: ctx.state.autoShapeOnPaste };
          createTextLayersInStoredSelections(texts, styles, matchedSelections, pointText, padding, ctx.state.direction, fitOpts, (ok, log) => {
            if (ok) {
              contextRef.current.dispatch({ type: "clearSelections" });
            }
            hkLog('HK MB paste', log);
          });
        } else {
          const line = ctx.state.currentLine || { text: "" };
          let style = applyTextScale(ctx.state.currentStyle, ctx.state.textScale);
          const pointText = ctx.state.pastePointText;
          const padding = ctx.state.internalPadding || 0;
          const fitOpts = { autoFit: ctx.state.autoFitOnPaste, autoFitPadding: ctx.state.autoFitPadding || 13, useScaling: !!ctx.state.autoFitScaling, scalingMin: ctx.state.autoFitScalingMin || 85, autoShape: ctx.state.autoShapeOnPaste };
          createTextLayerInSelection(line.text, style, pointText, padding, ctx.state.direction, fitOpts, (ok, log) => {
            if (ok) contextRef.current.dispatch({ type: "nextLine", add: true });
            hkLog('HK Paste', log);
          });
        }
      } else if (checkShortcut(realState, ctx.state.shortcut.apply)) {
        if (!checkRepeatTime()) return;
        const line = ctx.state.currentLine || { text: "" };
        let style = applyTextScale(ctx.state.currentStyle, ctx.state.textScale);
        getCurrentSelection((sel) => {
          if (sel) {
            const pointText = ctx.state.pastePointText;
            const padding = ctx.state.internalPadding || 0;
            const fitOpts = { autoFit: ctx.state.autoFitOnPaste, autoFitPadding: ctx.state.autoFitPadding || 13, useScaling: !!ctx.state.autoFitScaling, scalingMin: ctx.state.autoFitScalingMin || 85, autoShape: ctx.state.autoShapeOnPaste };
            createTextLayerInSelection(line.text, style, pointText, padding, ctx.state.direction, fitOpts, (ok, log) => {
              if (ok) contextRef.current.dispatch({ type: "nextLine", add: true });
              hkLog('HK Apply(paste)', log);
            });
          } else {
            setActiveLayerText(line.text, style, ctx.state.direction, (ok, log) => {
              if (ok) contextRef.current.dispatch({ type: "nextLine", add: true });
              hkLog('HK Apply(set)', log);
            });
          }
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.center)) {
        if (!checkRepeatTime()) return;
        const padding = ctx.state.internalPadding || 0;
        alignTextLayerToSelection(ctx.state.resizeTextBoxOnCenter, padding, (ok, log) => {
          hkLog('HK Center', log);
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.toggleMultiBubble)) {
        if (!checkRepeatTime(300)) return;
        contextRef.current.dispatch({ type: "setMultiBubbleMode", value: !ctx.state.multiBubbleMode });
      } else if (checkShortcut(realState, ctx.state.shortcut.next)) {
        if (!checkRepeatTime(300)) return;
        contextRef.current.dispatch({ type: "nextLine" });
      } else if (checkShortcut(realState, ctx.state.shortcut.previous)) {
        if (!checkRepeatTime(300)) return;
        contextRef.current.dispatch({ type: "prevLine" });
      } else if (checkShortcut(realState, ctx.state.shortcut.increase)) {
        if (!checkRepeatTime(300)) return;
        changeActiveLayerTextSize(ctx.state.textSizeIncrement || 1, (ok, log) => {
          hkLog('HK Size+', log);
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.decrease)) {
        if (!checkRepeatTime(300)) return;
        changeActiveLayerTextSize(-(ctx.state.textSizeIncrement || 1), (ok, log) => {
          hkLog('HK Size-', log);
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.insertText)) {
        if (!checkRepeatTime()) return;
        const line = ctx.state.currentLine || { text: "" };
        getCurrentSelection((sel) => {
          if (sel) {
            const pointText = ctx.state.pastePointText;
            const padding = ctx.state.internalPadding || 0;
            const fitOpts = { autoFit: ctx.state.autoFitOnPaste, autoFitPadding: ctx.state.autoFitPadding || 13, useScaling: !!ctx.state.autoFitScaling, scalingMin: ctx.state.autoFitScalingMin || 85, autoShape: ctx.state.autoShapeOnPaste };
            createTextLayerInSelection(line.text, ctx.state.currentStyle, pointText, padding, ctx.state.direction, fitOpts, (ok, log) => {
              if (ok) contextRef.current.dispatch({ type: "nextLine", add: true });
              hkLog('HK Insert(paste)', log);
            });
          } else {
            setActiveLayerText(line.text, null, ctx.state.direction, (ok, log) => {
              if (ok) contextRef.current.dispatch({ type: "nextLine", add: true });
              hkLog('HK Insert(set)', log);
            });
          }
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.autoFit)) {
        if (!checkRepeatTime()) return;
        autoFitText(ctx.state.autoFitPadding || 13, !!ctx.state.autoFitScaling, ctx.state.autoFitScalingMin || 85, ctx.state.autoShapeOnPaste, (ok, log) => {
          hkLog('HK AutoFit', log);
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.inverseStroke)) {
        if (!checkRepeatTime()) return;
        addInverseStroke((ok, log) => {
          hkLog('HK Stroke', log);
        });
      } else if (checkShortcut(realState, ctx.state.shortcut.nextPage)) {
        if (!checkRepeatTime(300)) return;
        contextRef.current.dispatch({ type: "nextPage" });
      } else {
        keyUp = true;
      }
    };

    const intervalId = setInterval(() => {
      const ctx = contextRef.current;
      if (document.hidden) return;
      if (ctx.state.modalType === "settings") return;
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
      getHotkeyPressed(checkState);
    }, intervalTime);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        const ctx = contextRef.current;
        if (ctx.state.modalType) {
          ctx.dispatch({ type: "setModal" });
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <React.Fragment />;
});

export default HotkeysListner;
