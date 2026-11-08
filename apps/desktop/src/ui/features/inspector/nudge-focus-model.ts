import {
  isOverlayOpen,
  isStageFrame,
  toStageElement,
} from "../../platform/canvas-focus.js";
import {
  canvasHasKeys,
  inspectorButtonFocused,
  isTypingTarget,
} from "../../platform/typing-target.js";
import { focusStageQuietly } from "./deps.js";

const runStageFocus = (): void => {
  const stage = toStageElement();

  if (stage) {
    focusStageQuietly(stage);
  }
};

const toCanvasKeys = (): void => {
  const focused = document.activeElement;

  if (focused instanceof HTMLIFrameElement && isStageFrame(focused)) {
    runStageFocus();
  }
};

const isEscapeBlocked = (event: KeyboardEvent): boolean => {
  const focused = document.activeElement;

  if (
    event.key !== "Escape" ||
    event.defaultPrevented ||
    !(focused instanceof HTMLElement) ||
    focused === document.body
  ) {
    return true;
  }

  return (
    canvasHasKeys() ||
    focused instanceof HTMLIFrameElement ||
    isTypingTarget(focused) ||
    isOverlayOpen()
  );
};

const shouldBlurToCanvas = (event: KeyboardEvent): boolean => {
  if (isEscapeBlocked(event)) {
    return false;
  }

  runStageFocus();
  event.preventDefault();
  event.stopImmediatePropagation();

  return true;
};

const shouldTakeArrowKeys = (): boolean => {
  if (canvasHasKeys()) {
    return true;
  }

  const button = inspectorButtonFocused();

  if (!button || isOverlayOpen()) {
    return false;
  }

  runStageFocus();

  return true;
};

export { shouldBlurToCanvas, shouldTakeArrowKeys, toCanvasKeys };
