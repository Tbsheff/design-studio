function stringifyArg(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value === String(value)) return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isString(value: unknown): value is string {
  return value === String(value);
}

function isObject(value: unknown): value is object {
  return value === Object(value);
}

function eventElement(event: Event): Element | null {
  const target = event.composedPath()[0] ?? event.target;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function rootElementOf(element: Element | null): Element | null {
  if (element instanceof SVGElement) return element.closest("svg") ?? element;
  return element;
}

function isTypingElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
  );
}

const DRAG_STYLE_ID = "studio-drag-no-select";

function holdTextSelection(on: boolean): void {
  const style = document.getElementById(DRAG_STYLE_ID);
  if (!on) {
    style?.remove();
    return;
  }
  if (style) return;
  const element = document.createElement("style");
  element.id = DRAG_STYLE_ID;
  element.textContent =
    "*{-webkit-user-select:none!important;user-select:none!important}";
  document.head.appendChild(element);
  window.getSelection()?.removeAllRanges();
}

function isEditKey(event: KeyboardEvent): boolean {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.repeat
  );
}

const IS_MAC = /mac|iphone|ipad/i.test(
  navigator.platform || navigator.userAgent
);

export {
  IS_MAC,
  eventElement,
  holdTextSelection,
  isEditKey,
  isObject,
  isString,
  isTypingElement,
  rootElementOf,
  stringifyArg,
};
