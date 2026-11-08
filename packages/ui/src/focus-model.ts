const FOCUSABLE =
  'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

const toFirstMatch = (
  root: Element | null,
  selector: string
): HTMLElement | null => {
  if (!root) {
    return null;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof HTMLElement && node.matches(selector)) {
      return node;
    }
  }

  return null;
};

const toFirstFocusable = (root: Element | null): HTMLElement | null =>
  toFirstMatch(root, FOCUSABLE);

const toAutofocusTarget = (root: Element): HTMLElement | null =>
  toFirstMatch(root, "[data-autofocus]");

const toModalBody = (root: Element): HTMLElement | null =>
  toFirstMatch(root, ".modal-body");

const toActiveElement = (): HTMLElement | null => {
  const { activeElement } = document;

  if (activeElement instanceof HTMLElement) {
    return activeElement;
  }

  return null;
};

const isPopoverBehindModal = (popover: HTMLElement | null): boolean => {
  if (popover === null) {
    return false;
  }

  const hasModal = document.body.matches(":has(dialog[open])");

  return hasModal && popover.closest("dialog[open]") === null;
};

export {
  isPopoverBehindModal,
  toActiveElement,
  toAutofocusTarget,
  toFirstFocusable,
  toModalBody,
};
