const stringifyArg = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (value === String(value)) {
    return value;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

const isString = (value: unknown): value is string => value === String(value);

const isNumber = (value: unknown): value is number => value === Number(value);

const isObject = (value: unknown): value is object => value === Object(value);

const tryDom = (task: () => void): boolean => {
  try {
    task();

    return true;
  } catch {
    return false;
  }
};

const eventElement = (event: Event): Element | null => {
  const target = event.composedPath()[0] ?? event.target;

  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
};

const rootElementOf = (element: Element | null): Element | null => {
  if (element instanceof SVGElement) {
    return element.closest("svg") ?? element;
  }

  return element;
};

const isTypingElement = (element: Element | null): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return (
    element.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
  );
};

const DRAG_STYLE_ID = "studio-drag-no-select";

const holdTextSelection = (on: boolean): void => {
  const style = document.getElementById(DRAG_STYLE_ID);

  if (!on) {
    style?.remove();

    return;
  }

  if (style) {
    return;
  }

  const element = document.createElement("style");
  element.id = DRAG_STYLE_ID;
  element.textContent =
    "*{-webkit-user-select:none!important;user-select:none!important}";
  document.head.appendChild(element);
  window.getSelection()?.removeAllRanges();
};

const isEditKey = (event: KeyboardEvent): boolean =>
  event.key === "Enter" &&
  !event.shiftKey &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.repeat;

const IS_MAC = /mac|iphone|ipad/iu.test(
  navigator.platform || navigator.userAgent
);

export {
  IS_MAC,
  eventElement,
  holdTextSelection,
  isEditKey,
  isNumber,
  isObject,
  isString,
  isTypingElement,
  rootElementOf,
  stringifyArg,
  tryDom,
};
