const OVERLAY_OPEN =
  'dialog[open], [role="dialog"], [role="menu"], [role="listbox"], [data-esc-owner]';

const STAGE_SELECTOR = ".canvas .stage";

const isOverlayOpen = (): boolean =>
  document.querySelector(OVERLAY_OPEN) !== null;

const toStageElement = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(STAGE_SELECTOR);

const isStageFrame = (element: Element): boolean =>
  element.closest(STAGE_SELECTOR) !== null;

export { isOverlayOpen, isStageFrame, toStageElement };
