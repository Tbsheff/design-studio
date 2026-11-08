import { findElement } from "./deps.js";

const focusLater = (selector: string): void => {
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, selector)?.focus()
  );
};

export { focusLater };
