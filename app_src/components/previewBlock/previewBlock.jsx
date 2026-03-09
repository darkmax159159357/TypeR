import "./previewBlock.scss";

import React from "react";
import PropTypes from "prop-types";
import { FiArrowRightCircle, FiPlusCircle, FiMinusCircle, FiArrowUp, FiArrowDown, FiAlertTriangle, FiX, FiMaximize, FiZap, FiCrosshair } from "react-icons/fi";
import { AiOutlineBorderInner } from "react-icons/ai";
import { MdCenterFocusWeak } from "react-icons/md";

import { locale, setActiveLayerText, getCurrentSelection, getSelectionBoundsHash, startSelectionMonitoring, stopSelectionMonitoring, getSelectionChanged, createTextLayerInSelection, createTextLayersInStoredSelections, alignTextLayerToSelection, changeActiveLayerTextSize, autoFitText, addInverseStroke, getStyleObject, scrollToLine, parseMarkdownRuns, getDebugLog, lamaCleanSelection, checkLamaModel, downloadLamaModel, downloadDetectionModel, lamaAutoClean, checkDetectionModel, nativeAlert } from "../../utils";
import { useContext } from "../../context";
import { resolveStyleForLine, resolveLineForSelection, applyTextScale } from "../../styleHelpers";

const PreviewBlock = React.memo(function PreviewBlock() {
  const context = useContext();
  const style = context.state.currentStyle || {};

  const dispatchLog = React.useCallback((prefix, log) => {
    const now = new Date();
    const pad2 = (n) => (n < 10 ? '0' : '') + n;
    const ts = now.getFullYear() + '-' + pad2(now.getMonth()+1) + '-' + pad2(now.getDate()) + ' ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
    const header = '--- [' + ts + '] ' + (prefix || 'Operation') + ' ---';
    const entry = header + '\n' + (log || '(no log from host)');
    context.dispatch({ type: "appendDebugLog", value: entry });
  }, []);

  React.useEffect(() => {
    getDebugLog((initLog) => {
      if (initLog) {
        dispatchLog('Startup', initLog);
      }
    });
  }, []);

  const line = context.state.currentLine || { text: "" };
  const textStyle = style.textProps?.layerText?.textStyleRange?.[0]?.textStyle || {};
  const styleObject = getStyleObject(textStyle);
  const markdownEnabled = context.state.interpretMarkdown !== false;
  const renderMarkdownText = React.useCallback((text) => {
    if (!markdownEnabled) return text;
    const parsed = parseMarkdownRuns(text || "");
    if (!parsed.hasFormatting) {
      return parsed.text;
    }
    return parsed.runs.map((run, index) => {
      const runStyle = {};
      if (run.bold) runStyle.fontWeight = "bold";
      if (run.italic) runStyle.fontStyle = "italic";
      return (
        <span key={`md-${index}`} style={runStyle}>
          {run.text}
        </span>
      );
    });
  }, [markdownEnabled]);

  
  const [lastSelectionHash, setLastSelectionHash] = React.useState(null);
  const selectionCheckInterval = React.useRef(null);
  const [shiftSelectionWarning, setShiftSelectionWarning] = React.useState(false);
  const shiftTipTimeout = React.useRef(null);
  const [showClearAllTip, setShowClearAllTip] = React.useState(false);
  const clearAllTipTimeout = React.useRef(null);
  const [clearAllTipShown, setClearAllTipShown] = React.useState(false);

  const showShiftTip = React.useCallback(() => {
    setShiftSelectionWarning(true);
    if (shiftTipTimeout.current) {
      clearTimeout(shiftTipTimeout.current);
    }
    shiftTipTimeout.current = setTimeout(() => setShiftSelectionWarning(false), 3500);
  }, []);

  const showClearAllTipFunc = React.useCallback(() => {
    if (clearAllTipShown) return;
    setShowClearAllTip(true);
    setClearAllTipShown(true);
    if (clearAllTipTimeout.current) {
      clearTimeout(clearAllTipTimeout.current);
    }
    clearAllTipTimeout.current = setTimeout(() => setShowClearAllTip(false), 5000);
  }, [clearAllTipShown]);

  const closeClearAllTip = () => {
    setShowClearAllTip(false);
    if (clearAllTipTimeout.current) {
      clearTimeout(clearAllTipTimeout.current);
    }
  };

  const addSelectionAndAdvance = (selection) => {
    if (!selection) return;
    context.dispatch({
      type: "addSelection",
      selection,
      lineIndex: context.state.currentLineIndex,
    });
    if (context.state.multiBubbleMode) {
      context.dispatch({ type: "nextLine", add: true });
    }
  };

  const addCurrentSelection = () => {
    getCurrentSelection((selection) => {
      if (selection) {
        addSelectionAndAdvance(selection);
      }
    });
  };

  const clearButtonTimeout = React.useRef(null);

  const clearStoredSelections = () => {
    const storedSelections = context.state.storedSelections || [];
    if (storedSelections.length === 0) return;

    context.dispatch({ type: "removeSelection", index: storedSelections.length - 1 });
  };

  const handleClearMouseDown = () => {
    const timeout = setTimeout(() => {
      context.dispatch({ type: "clearSelections" });
      clearButtonTimeout.current = null;
    }, 1000);
    clearButtonTimeout.current = timeout;
  };

  const handleClearMouseUp = () => {
    if (clearButtonTimeout.current) {
      clearTimeout(clearButtonTimeout.current);
      clearButtonTimeout.current = null;
      clearStoredSelections();
    }
  };

  const handleClearMouseLeave = () => {
    if (clearButtonTimeout.current) {
      clearTimeout(clearButtonTimeout.current);
      clearButtonTimeout.current = null;
    }
  };

  
  const checkForSelectionChange = React.useCallback(() => {
    if (!context.state.multiBubbleMode) return;

    getSelectionChanged((selection) => {
      if (selection) {
        if (selection.selectionRemoved) {
          if (context.state.storedSelections && context.state.storedSelections.length > 0) {
            context.dispatch({ type: "removeSelection", index: context.state.storedSelections.length - 1 });
            context.dispatch({ type: "prevLine" });
            setLastSelectionHash(null);
          }
          return;
        }

        if (selection.multiSelection && selection.multiSelection.length > 0) {
          const storedHashes = context.state.storedSelections?.map(s => getSelectionBoundsHash(s)) || [];
          const lines = context.state.lines || [];

          let addedCount = 0;
          let runningLineIndex = context.state.currentLineIndex;
          selection.multiSelection.forEach(sel => {
            const { shiftKey, ...cleanSelection } = sel;
            const newHash = getSelectionBoundsHash(cleanSelection);
            if (!storedHashes.includes(newHash)) {
              if (addedCount === 0) setLastSelectionHash(newHash);

              context.dispatch({
                type: "addSelection",
                selection: cleanSelection,
                lineIndex: runningLineIndex,
              });
              addedCount++;

              const currentLine = lines[runningLineIndex];
              if (currentLine && currentLine.last) return;
              for (let j = runningLineIndex + 1; j < lines.length; j++) {
                if (!lines[j].ignore) {
                  runningLineIndex = lines[j].rawIndex;
                  break;
                }
              }
            }
          });

          if (addedCount > 0 && context.state.multiBubbleMode) {
            for (let n = 0; n < addedCount; n++) {
              context.dispatch({ type: "nextLine", add: true });
            }
          }
          return;
        }

        const { shiftKey, ...cleanSelection } = selection;
        const newHash = getSelectionBoundsHash(cleanSelection);
        const storedHashes = context.state.storedSelections?.map(s => getSelectionBoundsHash(s)) || [];

        
        if (!storedHashes.includes(newHash)) {
          setLastSelectionHash(newHash);
          addSelectionAndAdvance(cleanSelection);
        }
      }
    });
  }, [context.state.multiBubbleMode, context.state.storedSelections, context.state.currentLineIndex]);

  
  React.useEffect(() => {
    if (context.state.multiBubbleMode) {
      
      startSelectionMonitoring();
      
      selectionCheckInterval.current = setInterval(checkForSelectionChange, 200);
    } else {
      
      stopSelectionMonitoring();
      if (selectionCheckInterval.current) {
        clearInterval(selectionCheckInterval.current);
        selectionCheckInterval.current = null;
      }
      setLastSelectionHash(null);
    }

    
    return () => {
      stopSelectionMonitoring();
      if (selectionCheckInterval.current) {
        clearInterval(selectionCheckInterval.current);
      }
      if (shiftTipTimeout.current) {
        clearTimeout(shiftTipTimeout.current);
      }
      if (clearAllTipTimeout.current) {
        clearTimeout(clearAllTipTimeout.current);
      }
      if (clearButtonTimeout.current) {
        clearTimeout(clearButtonTimeout.current);
      }
    };
  }, [context.state.multiBubbleMode, checkForSelectionChange]);
  React.useEffect(() => {
    if (!context.state.multiBubbleMode && shiftSelectionWarning) {
      setShiftSelectionWarning(false);
    }
  }, [context.state.multiBubbleMode, shiftSelectionWarning]);

  
  React.useEffect(() => {
    const storedSelections = context.state.storedSelections || [];
    if (context.state.multiBubbleMode && storedSelections.length > 10 && !clearAllTipShown) {
      showClearAllTipFunc();
    }
    
    if (!context.state.multiBubbleMode || storedSelections.length === 0) {
      setClearAllTipShown(false);
      setShowClearAllTip(false);
    }
  }, [context.state.multiBubbleMode, context.state.storedSelections, clearAllTipShown, showClearAllTipFunc]);

  const createLayer = () => {
    const storedSelections = context.state.storedSelections || [];

    if (context.state.multiBubbleMode && storedSelections.length > 0) {
      
      const texts = [];
      const styles = [];
      const matchedSelections = [];
      const lines = context.state.lines || [];
      const nextFallbackIndexRef = { current: context.state.currentLineIndex };

      for (let i = 0; i < storedSelections.length; i++) {
        const selection = storedSelections[i];
        const targetLine = resolveLineForSelection(selection, lines, nextFallbackIndexRef);
        if (!targetLine) {
          continue;
        }

        texts.push(targetLine.text);
        matchedSelections.push(selection);

        let lineStyle = resolveStyleForLine(targetLine, selection, context.state.styles, context.state.currentStyle);
        lineStyle = applyTextScale(lineStyle, context.state.textScale);
        styles.push(lineStyle);
      }

      const pointText = context.state.pastePointText;
      const padding = context.state.internalPadding || 0;
      const direction = context.state.direction;
      const fitOpts = { autoFit: context.state.autoFitOnPaste, autoFitPadding: context.state.autoFitPadding || 13, useScaling: !!context.state.autoFitScaling, scalingMin: context.state.autoFitScalingMin || 85, autoShape: context.state.autoShapeOnPaste };
      createTextLayersInStoredSelections(texts, styles, matchedSelections, pointText, padding, direction, fitOpts, (ok, log) => {
        if (ok) {
          context.dispatch({ type: "clearSelections" });
        }
        dispatchLog('MB paste', log);
      });
    } else {
      let lineStyle = applyTextScale(context.state.currentStyle, context.state.textScale);
      const pointText = context.state.pastePointText;
      const padding = context.state.internalPadding || 0;
      const direction = context.state.direction;
      const fitOpts = { autoFit: context.state.autoFitOnPaste, autoFitPadding: context.state.autoFitPadding || 13, useScaling: !!context.state.autoFitScaling, scalingMin: context.state.autoFitScalingMin || 85, autoShape: context.state.autoShapeOnPaste };
      createTextLayerInSelection(line.text, lineStyle, pointText, padding, direction, fitOpts, (ok, log) => {
        if (ok) context.dispatch({ type: "nextLine", add: true });
        dispatchLog('Paste', log);
      });
    }
  };

  const insertStyledText = () => {
    const storedSelections = context.state.storedSelections || [];

    if (context.state.multiBubbleMode && storedSelections.length > 0) {
      
      createLayer();
    } else {
      let lineStyle = applyTextScale(context.state.currentStyle, context.state.textScale);
      if (context.state.autoFitOnPaste || context.state.autoShapeOnPaste) {
        getCurrentSelection((sel) => {
          if (sel) {
            const pointText = context.state.pastePointText;
            const padding = context.state.internalPadding || 0;
            const fitOpts = { autoFit: context.state.autoFitOnPaste, autoFitPadding: context.state.autoFitPadding || 13, useScaling: !!context.state.autoFitScaling, scalingMin: context.state.autoFitScalingMin || 85, autoShape: context.state.autoShapeOnPaste };
            createTextLayerInSelection(line.text, lineStyle, pointText, padding, context.state.direction, fitOpts, (ok, log) => {
              if (ok) context.dispatch({ type: "nextLine", add: true });
              dispatchLog('Insert', log);
            });
          } else {
            setActiveLayerText(line.text, lineStyle, context.state.direction, (ok, log) => {
              if (ok) context.dispatch({ type: "nextLine", add: true });
              dispatchLog('Change', log);
            });
          }
        });
      } else {
        setActiveLayerText(line.text, lineStyle, context.state.direction, (ok, log) => {
          if (ok) context.dispatch({ type: "nextLine", add: true });
          dispatchLog('Change', log);
        });
      }
    }
  };

  const currentLineClick = () => {
    if (line.rawIndex === void 0) return;
    scrollToLine(line.rawIndex);
  };

  const setTextScale = (scale) => {
    context.dispatch({ type: "setTextScale", scale });
  };
  const focusScale = () => {
    if (!context.state.textScale) setTextScale(100);
  };
  const blurScale = () => {
    if (context.state.textScale === 100) setTextScale(null);
  };

  const setTextSizeIncrement = (increment) => {
    context.dispatch({ type: "setTextSizeIncrement", increment });
  };
  const handleIncrementChange = (e) => {
    setTextSizeIncrement(e.target.value);
  };
  const handleIncrementBlur = () => {
    if (!context.state.textSizeIncrement || context.state.textSizeIncrement < 1) {
      setTextSizeIncrement(1);
    }
  };

  return (
    <React.Fragment>
      <div className="preview-top">
        {context.state.multiBubbleMode && context.state.storedSelections && context.state.storedSelections.length > 0 && (
          <div className="preview-top_selection-controls">
            <div className="preview-top_selection-info">
              <span className="preview-top_selection-count">{context.state.storedSelections.length} {context.state.storedSelections.length > 1 ? (locale.selectionsCount || 'selections') : (locale.selectionCount || 'selection')}</span>
              <button
                className="topcoat-icon-button--large"
                title={locale.clearSelections || "Clear selections"}
                onMouseDown={handleClearMouseDown}
                onMouseUp={handleClearMouseUp}
                onMouseLeave={handleClearMouseLeave}
              >
                <FiMinusCircle size={16} />
              </button>
            </div>
          </div>
        )}
        {context.state.multiBubbleMode && context.state.showTips !== false && shiftSelectionWarning && (
          <div className="preview-top_selection-warning">
            <FiAlertTriangle size={14} />
            <span>{locale.multiBubbleShiftTip || "Multi-bubble mode works with one selection at a time. Release Shift and make your selections one by one."}</span>
          </div>
        )}
        {context.state.multiBubbleMode && context.state.showTips !== false && showClearAllTip && (
          <div className="preview-top_selection-tip">
            <FiMinusCircle size={14} />
            <span>{locale.multiBubbleClearAllTip || "Tip: Hold the - button for 1 second to clear all selections at once"}</span>
            <button
              className="preview-top_selection-tip-close"
              onClick={closeClearAllTip}
              title={locale.close || "Close"}
            >
              <FiX size={14} />
            </button>
          </div>
        )}
        <div className="preview-top_main-controls">
          <button className="preview-top_big-btn preview-top_big-btn--small topcoat-button--large--cta" title={
            context.state.multiBubbleMode && context.state.storedSelections && context.state.storedSelections.length > 0
              ? `Insert ${context.state.storedSelections.length} text${context.state.storedSelections.length > 1 ? 's' : ''}`
              : locale.createLayerDescr
          } onClick={createLayer}>
            <AiOutlineBorderInner size={18} /> {locale.createLayer}
          </button>
          <button className="preview-top_big-btn preview-top_big-btn--small topcoat-button--large" title={locale.alignLayerDescr} onClick={() => {
            const padding = context.state.internalPadding || 0;
            alignTextLayerToSelection(context.state.resizeTextBoxOnCenter, padding, (ok, log) => dispatchLog('Align', log));
          }}>
            <MdCenterFocusWeak size={18} /> {locale.alignLayer}
          </button>
          <button className="preview-top_big-btn preview-top_big-btn--small topcoat-button--large" title={locale.autoFitDescr || "Auto-fit text size to selection"} onClick={() => {
            autoFitText(context.state.autoFitPadding || 13, !!context.state.autoFitScaling, context.state.autoFitScalingMin || 85, context.state.autoShapeOnPaste, (ok, log) => dispatchLog('AutoFit', log));
          }}>
            <FiMaximize size={18} /> {locale.autoFit || "Fit"}
          </button>
          <button className="preview-top_big-btn preview-top_big-btn--small topcoat-button--large" title={locale.inverseStrokeDescr || "Add stroke with inverse color of text"} onClick={() => {
            addInverseStroke((ok, log) => dispatchLog('Stroke', log));
          }}>
            <AiOutlineBorderInner size={18} /> {locale.inverseStroke || "Stroke"}
          </button>
          <button
            className={`preview-top_big-btn preview-top_big-btn--small topcoat-button--large${(context.state.aiCleanProcessing || context.state.lamaDownloading) ? " preview-top_big-btn--loading" : ""}`}
            title="LaMa Clean - Remove text from selection using local AI"
            disabled={context.state.aiCleanProcessing || context.state.lamaDownloading}
            onClick={() => {
              const runClean = () => {
                context.dispatch({ type: "setAiCleanProcessing", value: true });
                const _steps = [];
                const _addStep = (s) => { _steps.push(s); };
                _addStep("Started");
                lamaCleanSelection(
                  (ok, log) => {
                    context.dispatch({ type: "setAiCleanProcessing", value: false });
                    _addStep("Done!");
                    dispatchLog('LaMa Clean', _steps.join('\n'));
                  },
                  (errType, mins, detail) => {
                    context.dispatch({ type: "setAiCleanProcessing", value: false });
                    let msg = "LaMa Clean error";
                    if (errType === "noSelection") msg = "No selection. Select an area first.";
                    else if (errType === "noDocument") msg = "No document open.";
                    else if (errType === "smallSelection") msg = "Selection too small.";
                    else if (errType === "processError") msg = "LaMa error: " + (detail || "Unknown").slice(0, 120);
                    else if (errType === "outputNotFound") msg = "LaMa did not produce output file.";
                    else if (errType === "modelNotReady") msg = "LaMa model not ready. Please wait for download to complete.";
                    else if (errType === "pythonNotFound") msg = "Python 3 not found. Please install Python 3.8+ from python.org and restart Photoshop.";
                    else if (errType === "scriptNotFound") msg = "LaMa inference script not found. Please reinstall TypeR.";
                    else if (errType === "missingPackages") msg = "Installing required packages... Please click LaMa Clean again in a moment.";
                    else if (errType === "pipError") msg = "Failed to install Python packages: " + (detail || "").slice(0, 100);
                    else msg = "Error: " + errType + (detail ? " - " + detail.slice(0, 80) : "");
                    nativeAlert(msg, "LaMa Clean");
                    _addStep("ERROR: " + msg);
                    dispatchLog('LaMa Clean', _steps.join('\n'));
                  },
                  (stepMsg) => {
                    _addStep(stepMsg);
                  }
                );
              };

              if (!context.state.lamaModelReady) {
                if (window.__typer_node_available === false) {
                  nativeAlert("Node.js is not available in this Photoshop version.\n\nTo use LaMa Clean, manually download the model:\n1. Download big-lama.pt from Google Drive\n2. Place it in:\n" + (typeof process !== 'undefined' && process.platform === "win32" ? "%LOCALAPPDATA%\\TypeR_lama\\" : "~/Library/Application Support/TypeR_lama/") + "\n3. Restart Photoshop", "LaMa Clean");
                  return;
                }
                context.dispatch({ type: "setLamaDownloading", value: true });
                downloadLamaModel(
                  (progress) => {
                    context.dispatch({ type: "setLamaDownloadProgress", value: progress });
                  },
                  () => {
                    context.dispatch({ type: "setLamaDownloading", value: false });
                    context.dispatch({ type: "setLamaModelReady", value: true });
                    runClean();
                  },
                  (errMsg) => {
                    context.dispatch({ type: "setLamaDownloading", value: false });
                    nativeAlert("Failed to download LaMa model: " + errMsg + "\n\nManual install:\n1. Download big-lama.pt from Google Drive\n2. Place it in:\n" + (process.platform === "win32" ? "%LOCALAPPDATA%\\TypeR_lama\\" : "~/Library/Application Support/TypeR_lama/") + "\n3. Restart Photoshop", "LaMa Clean");
                  }
                );
                return;
              }

              runClean();
            }}
          >
            <FiZap size={18} /> {context.state.lamaDownloading ? ("Downloading " + (context.state.lamaDownloadProgress || 0) + "%") : (context.state.aiCleanProcessing ? "Cleaning..." : "LaMa Clean")}
          </button>
          <button
            className={`preview-top_big-btn preview-top_big-btn--small topcoat-button--large${context.state.autoCleanProcessing ? " preview-top_big-btn--loading" : ""}${context.state.detectionModelDownloading ? " preview-top_big-btn--loading" : ""}`}
            title="Auto Clean - Detect and remove all text automatically"
            disabled={context.state.autoCleanProcessing || context.state.aiCleanProcessing || context.state.lamaDownloading || context.state.detectionModelDownloading}
            onClick={() => {
              const detReady = checkDetectionModel();
              if (detReady && !context.state.detectionModelReady) {
                context.dispatch({ type: "setDetectionModelReady", value: true });
              }

              const runAutoClean = () => {
                context.dispatch({ type: "setAutoCleanProcessing", value: true });
                const _steps = [];
                lamaAutoClean(
                  (ok, log) => {
                    context.dispatch({ type: "setAutoCleanProcessing", value: false });
                    _steps.push("Done!");
                    dispatchLog('Auto Clean', _steps.join('\n'));
                  },
                  (errType, mins, detail) => {
                    context.dispatch({ type: "setAutoCleanProcessing", value: false });
                    let msg = "Auto Clean error";
                    if (errType === "detectionModelNotFound") msg = "Detection model not found. Place public.pt in TypeR_lama/detection/ folder.";
                    else if (errType === "modelNotReady") msg = "LaMa model not ready. Please wait for download.";
                    else if (errType === "noDocument") msg = "No document open.";
                    else if (errType === "pythonNotFound") msg = "Python 3 not found.";
                    else if (errType === "missingDetPackages") msg = "Installing detection packages... Please click Auto Clean again in a moment.";
                    else if (errType === "pipError") msg = "Failed to install packages: " + (detail || "").slice(0, 100);
                    else msg = "Error: " + errType + (detail ? " - " + detail.slice(0, 80) : "");
                    nativeAlert(msg, "Auto Clean");
                    _steps.push("ERROR: " + msg);
                    dispatchLog('Auto Clean', _steps.join('\n'));
                  },
                  (stepMsg) => {
                    _steps.push(stepMsg);
                    context.dispatch({ type: "setAutoCleanProgress", value: stepMsg });
                  }
                );
              };

              const ensureDetModel = (cb) => {
                if (checkDetectionModel()) {
                  context.dispatch({ type: "setDetectionModelReady", value: true });
                  cb();
                  return;
                }
                if (window.__typer_node_available === false) {
                  nativeAlert("Node.js is not available in this Photoshop version.\n\nTo use Auto Clean, manually download the detection model:\n1. Download public.pt\n2. Place it in:\n" + (typeof process !== 'undefined' && process.platform === "win32" ? "%LOCALAPPDATA%\\TypeR_lama\\detection\\" : "~/Library/Application Support/TypeR_lama/detection/") + "\n3. Restart Photoshop", "Auto Clean");
                  return;
                }
                context.dispatch({ type: "setDetectionModelDownloading", value: true });
                downloadDetectionModel(
                  (progress) => { context.dispatch({ type: "setDetectionModelDownloadProgress", value: progress }); },
                  () => {
                    context.dispatch({ type: "setDetectionModelDownloading", value: false });
                    context.dispatch({ type: "setDetectionModelReady", value: true });
                    cb();
                  },
                  (errMsg) => {
                    context.dispatch({ type: "setDetectionModelDownloading", value: false });
                    nativeAlert("Failed to download detection model: " + errMsg, "Auto Clean");
                  }
                );
              };

              const ensureLamaModel = (cb) => {
                if (checkLamaModel()) {
                  if (!context.state.lamaModelReady) context.dispatch({ type: "setLamaModelReady", value: true });
                  cb();
                  return;
                }
                if (window.__typer_node_available === false) {
                  nativeAlert("Node.js is not available in this Photoshop version.\n\nTo use Auto Clean, manually download the models.\n1. Restart Photoshop", "Auto Clean");
                  return;
                }
                context.dispatch({ type: "setLamaDownloading", value: true });
                downloadLamaModel(
                  (progress) => { context.dispatch({ type: "setLamaDownloadProgress", value: progress }); },
                  () => {
                    context.dispatch({ type: "setLamaDownloading", value: false });
                    context.dispatch({ type: "setLamaModelReady", value: true });
                    cb();
                  },
                  (errMsg) => {
                    context.dispatch({ type: "setLamaDownloading", value: false });
                    nativeAlert("Failed to download LaMa model: " + errMsg, "Auto Clean");
                  }
                );
              };

              ensureLamaModel(() => {
                ensureDetModel(() => {
                  runAutoClean();
                });
              });
            }}
          >
            <FiCrosshair size={18} /> {context.state.detectionModelDownloading ? ("Downloading Det " + (context.state.detectionModelDownloadProgress || 0) + "%") : (context.state.autoCleanProcessing ? (context.state.autoCleanProgress || "Detecting...") : "Auto Clean")}
          </button>
          <div className="preview-top_change-size-cont">
            <button className="topcoat-icon-button--large" title={locale.layerTextSizeMinus} onClick={() => changeActiveLayerTextSize(-(context.state.textSizeIncrement || 1), (ok, log) => dispatchLog('Resize', log))}>
              <FiMinusCircle size={18} />
            </button>
            <div className="preview-top_size-input">
              <input min={1} max={99} type="number" value={context.state.textSizeIncrement || ""} onChange={handleIncrementChange} onBlur={handleIncrementBlur} className="topcoat-text-input" />
              <span>px</span>
            </div>
            <button className="topcoat-icon-button--large" title={locale.layerTextSizePlus} onClick={() => changeActiveLayerTextSize(context.state.textSizeIncrement || 1, (ok, log) => dispatchLog('Resize', log))}>
              <FiPlusCircle size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="preview-bottom">
        <div className="preview-nav">
          <button className="topcoat-icon-button--large" title={locale.prevLine} onClick={() => context.dispatch({ type: "prevLine" })}>
            <FiArrowUp size={18} />
          </button>
          <button className="topcoat-icon-button--large" title={locale.nextLine} onClick={() => context.dispatch({ type: "nextLine" })}>
            <FiArrowDown size={18} />
          </button>
        </div>
        <div className="preview-current hostBgdDark" title={locale.scrollToLine} onClick={currentLineClick}>
          <div className="preview-line-info">
            <div className="preview-line-info-text">
              {locale.previewLine}: <b>{line.index || "—"}</b>, {locale.previewStyle}: <b className="preview-line-style-name">{style.name || "—"}</b>, {locale.previewTextScale}:
              <div className="preview-line-scale">
                <input min={1} max={999} type="number" placeholder="100" value={context.state.textScale || ""} onChange={(e) => setTextScale(e.target.value)} onFocus={focusScale} onBlur={blurScale} className="topcoat-text-input" />
                <span>%</span>
              </div>
            </div>
            <div className="preview-line-info-actions" title={locale.insertStyledText}>
              <FiArrowRightCircle size={16} onClick={insertStyledText} />
            </div>
          </div>
          <div className="preview-line-text" style={styleObject}>
            <span style={{ fontFamily: styleObject.fontFamily || "Tahoma" }}>
              {renderMarkdownText(line.text || "")}
            </span>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
});

export default PreviewBlock;
