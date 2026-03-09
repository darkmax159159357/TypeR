import "./footer.scss";

import React from "react";
import PropTypes from "prop-types";
import { locale } from "../../utils";
import { useContext } from "../../context";
import HiddenFileInput from "../hiddenFileInput/hiddenFileInput";

const AppFooter = React.memo(function AppFooter() {
  const context = useContext();
  const openSettings = () => {
    context.dispatch({
      type: "setModal",
      modal: "settings",
    });
  };
  const openHelp = () => {
    context.dispatch({
      type: "setModal",
      modal: "help",
    });
  };
  const fileInputRef = React.useRef();

  const openRepository = () => {
    if (context.state.images.length) {
      context.dispatch({ type: "setImages", images: [] });
      return;
    }
    fileInputRef.current?.click();
  };

  const toggleMultiBubble = () => {
    context.dispatch({ type: "setMultiBubbleMode", value: !context.state.multiBubbleMode });
  };

  const toggleAutoShape = () => {
    context.dispatch({ type: "setAutoShapeOnPaste", value: !context.state.autoShapeOnPaste });
  };

  const toggleAutoFit = () => {
    if (!context.state.autoShapeOnPaste) return;
    context.dispatch({ type: "setAutoFitOnPaste", value: !context.state.autoFitOnPaste });
  };

  return (
    <React.Fragment>
      <span className="link" onClick={openHelp}>
        {locale.footerHelp}
      </span>
      <span className="link" onClick={openSettings}>
        {locale.footerSettings}
      </span>
      <span className="link" onClick={openRepository}>
        {context.state.images.length
          ? locale.footerDesyncRepo
          : locale.footerOpenRepo}
      </span>
      <span
        className="link footer-mode-indicator"
        onClick={toggleMultiBubble}
        title={locale.multiBubbleModeHint || "Capture multiple selections to insert multiple texts at once"}
      >
        <span className={`footer-mode-dot ${context.state.multiBubbleMode ? "is-on" : ""}`} />
        <span className="footer-mode-label">{locale.multiBubbleModeShort || "MB"}</span>
        <span className="footer-mode-status">
          {context.state.multiBubbleMode ? (locale.multiBubbleModeOn || "ON") : (locale.multiBubbleModeOff || "OFF")}
        </span>
      </span>
      <span
        className="link footer-mode-indicator"
        onClick={toggleAutoShape}
        title={locale.autoShapeHint || "Auto-shape line breaks to fit bubble on paste"}
      >
        <span className={`footer-mode-dot ${context.state.autoShapeOnPaste ? "is-on" : ""}`} />
        <span className="footer-mode-label">{locale.autoShapeShort || "AS"}</span>
        <span className="footer-mode-status">
          {context.state.autoShapeOnPaste ? (locale.autoShapeOn || "ON") : (locale.autoShapeOff || "OFF")}
        </span>
      </span>
      <span
        className={`link footer-mode-indicator${!context.state.autoShapeOnPaste ? " is-disabled" : ""}`}
        onClick={toggleAutoFit}
        title={!context.state.autoShapeOnPaste ? (locale.autoFitNeedsShape || "Auto-shape must be ON to use auto-fit") : (locale.autoFitHint || "Auto-fit text size to bubble on paste")}
      >
        <span className={`footer-mode-dot ${context.state.autoFitOnPaste ? "is-on" : ""}`} />
        <span className="footer-mode-label">{locale.autoFitShort || "AF"}</span>
        <span className="footer-mode-status">
          {context.state.autoFitOnPaste ? (locale.autoFitOn || "ON") : (locale.autoFitOff || "OFF")}
        </span>
      </span>
      <HiddenFileInput ref={fileInputRef} />
    </React.Fragment>
  );
});

export default AppFooter;
