import {
  canvasHasKeys,
  isArrowOwned,
  isTextField,
  isTypingTarget,
} from "./typing-target.js";

const OVERLAY_OPEN =
  'dialog[open], [role="dialog"], [role="menu"], [role="listbox"], [data-esc-owner]';

const STAGE_SELECTOR = ".canvas .stage";

const isOverlayOpen = (): boolean =>
  document.querySelector(OVERLAY_OPEN) !== null;

const toStageElement = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(STAGE_SELECTOR);

const isStageFrame = (element: Element): boolean =>
  element.closest(STAGE_SELECTOR) !== null;

const canTakeCanvasKeys = (): boolean => {
  if (canvasHasKeys()) {
    return true;
  }

  const active = document.activeElement;

  if (
    !(active instanceof HTMLElement) ||
    active instanceof HTMLIFrameElement ||
    isOverlayOpen()
  ) {
    return false;
  }

  return (
    !isTextField(active) && !isTypingTarget(active) && !isArrowOwned(active)
  );
};

export { canTakeCanvasKeys, isOverlayOpen, isStageFrame, toStageElement };
