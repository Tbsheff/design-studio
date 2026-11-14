import type { BridgeToParent } from "@design-studio/contracts";

import { isHistoryKey } from "./history-key.js";
import {
  createEditGuard,
  isMixedLayer,
  restoreSnapshot,
  selectTextRange,
  toSnapshot,
} from "./text-edit-range-mode.js";
import type { NodeSnapshot } from "./text-edit-range-mode.js";
import { createTextRange } from "./text-range.js";
import type { TextRangeBody } from "./text-range.js";

type TextEditBody =
  | Omit<Extract<BridgeToParent, { type: "text-edit" }>, "ns" | "token">
  | Omit<Extract<BridgeToParent, { type: "text-commit" }>, "ns" | "token">
  | Omit<Extract<BridgeToParent, { type: "text-edit-blocked" }>, "ns" | "token">
  | Omit<Extract<BridgeToParent, { type: "history-key" }>, "ns" | "token">
  | TextRangeBody
  | { type: "hover"; rect: null };

export interface TextEditDeps {
  post: (body: TextEditBody) => void;
  selectorFor: (element: Element) => string;
  previewText: (selector: string, text: string) => void;
  onStart: (element: Element) => void;
}

export interface TextEditor {
  editing(): boolean;
  owns(element: Element | null): boolean;
  holdFor(element: Element): boolean;
  allow(on: boolean): void;
  canEdit(element: Element | null): element is HTMLElement;
  start(element: HTMLElement, at?: { x: number; y: number }): void;
  resume(element: HTMLElement, start: number, end: number, text: string): void;
  commit(): void;
  cancel(): void;
  onKeyDown(event: KeyboardEvent): boolean;
}

const MAX_EDIT_TEXT = 5000;
const EDIT_ATTR = "data-studio-text-edit";
const STYLE_ID = "studio-text-edit-style";
const CARET_COLOR = "oklch(0.55 0.18 254)";

const NON_TEXT_TAGS = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "textarea",
  "img",
  "input",
  "select",
  "option",
  "br",
  "hr",
  "svg",
  "video",
  "audio",
  "canvas",
  "html",
  "body",
  "head",
]);

interface Session {
  element: HTMLElement;
  selector: string;
  snapshot: NodeSnapshot;
  original: string;
  hadEditable: string | null;
  isHeld: boolean;
  isRangeMode: boolean;
  release: () => void;
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `[${EDIT_ATTR}]{outline:none!important;caret-color:${CARET_COLOR}!important;cursor:text!important;-webkit-user-select:text!important;user-select:text!important}`;
  document.head.appendChild(style);
}

function plainText(element: Element): string {
  let text = "";

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node as Text).data;
    } else if (node instanceof HTMLBRElement) {
      text += "\n";
    } else if (node instanceof Element) {
      text += plainText(node);
    }
  }

  return text;
}

function caretAt(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };

  const position = doc.caretPositionFromPoint?.(x, y);

  if (position) {
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);

    return range;
  }

  return document.caretRangeFromPoint?.(x, y) ?? null;
}

function placeCaret(element: HTMLElement, at?: { x: number; y: number }): void {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  let range = at ? caretAt(at.x, at.y) : null;

  if (!range || !element.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(element);
  } else {
    range.collapse(true);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlain(event: ClipboardEvent): void {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") ?? "";
  document.execCommand("insertText", false, text);
}

export function createTextEditor(deps: TextEditDeps): TextEditor {
  let allowed = false;
  let session: Session | null = null;
  const range = createTextRange({
    post: deps.post,
    selectorFor: deps.selectorFor,
    textOf: plainText,
  });

  const restore = (current: Session): void => {
    restoreSnapshot(current.snapshot);
  };

  const finish = (current: Session): void => {
    session = null;
    current.release();
    range.unwatch();
    const { element } = current;
    element.removeEventListener("blur", onBlur);
    element.removeEventListener("paste", insertPlain);
    element.removeAttribute(EDIT_ATTR);

    if (current.hadEditable === null) {
      element.removeAttribute("contenteditable");
    } else {
      element.setAttribute("contenteditable", current.hadEditable);
    }

    window.getSelection()?.removeAllRanges();

    if (document.activeElement === element) {
      element.blur();
    }
  };

  const cancel = (): void => {
    const current = session;

    if (!current) {
      return;
    }

    finish(current);
    restore(current);
    deps.post({
      type: "text-edit",
      selector: current.selector,
      state: "cancel",
      isRangeMode: current.isRangeMode,
    });
  };

  const commit = (): void => {
    const current = session;

    if (!current) {
      return;
    }

    if (current.isRangeMode) {
      cancel();

      return;
    }

    const text = plainText(current.element).trim();
    finish(current);
    restore(current);

    if (text === current.original.trim() || text.length > MAX_EDIT_TEXT) {
      deps.post({
        type: "text-edit",
        selector: current.selector,
        state: "cancel",
        isRangeMode: false,
      });

      return;
    }

    deps.previewText(current.selector, text);
    deps.post({
      type: "text-commit",
      selector: current.selector,
      text,
      at: performance.timeOrigin + performance.now(),
      isHeld: current.isHeld,
    });
  };

  function onBlur(): void {
    commit();
  }

  const canEdit = (element: Element | null): element is HTMLElement =>
    allowed &&
    element instanceof HTMLElement &&
    element.isConnected &&
    (element.children.length === 0 || isMixedLayer(element)) &&
    !NON_TEXT_TAGS.has(element.tagName.toLowerCase()) &&
    !element.isContentEditable &&
    (element.textContent ?? "").length <= MAX_EDIT_TEXT;

  const start = (element: HTMLElement, at?: { x: number; y: number }): void => {
    if (session?.element === element) {
      return;
    }

    commit();

    if (!canEdit(element)) {
      return;
    }

    const snapshot = toSnapshot(element);
    const selector = deps.selectorFor(element);
    const isRangeMode = element.children.length > 0;

    const release = createEditGuard({
      element,
      isRangeMode,
      onBlocked: () => deps.post({ type: "text-edit-blocked", selector }),
      onOuterChange: () => rebase(element),
      snapshot,
    });

    session = {
      element,
      selector,
      snapshot,
      original: element.textContent ?? "",
      hadEditable: element.getAttribute("contenteditable"),
      isHeld: false,
      isRangeMode,
      release,
    };
    deps.onStart(element);
    ensureStyle();
    element.setAttribute(EDIT_ATTR, "");
    element.contentEditable = "plaintext-only";

    if (element.contentEditable !== "plaintext-only") {
      element.contentEditable = "true";
      element.addEventListener("paste", insertPlain);
    }

    element.focus({ preventScroll: true });
    placeCaret(element, at);
    element.addEventListener("blur", onBlur);
    range.watch({
      element,
      original: session.original,
      selector: session.selector,
    });
    deps.post({
      type: "text-edit",
      selector: session.selector,
      state: "start",
      isRangeMode,
    });
  };

  function rebase(element: HTMLElement): void {
    const current = session;

    if (current?.element !== element) {
      return;
    }

    const last = range.lastRange();
    finish(current);
    deps.post({
      type: "text-edit",
      selector: current.selector,
      state: "cancel",
      isRangeMode: current.isRangeMode,
    });
    start(element);

    if (last !== null && session?.element === element) {
      selectTextRange(element, last.start, last.end);
    }
  }

  const resume = (
    element: HTMLElement,
    from: number,
    to: number,
    text: string
  ): void => {
    if (plainText(element) !== text) {
      return;
    }

    start(element);

    if (session?.element === element) {
      selectTextRange(element, from, to);
    }
  };

  const onHistoryKey = (current: Session, event: KeyboardEvent): boolean => {
    if (!isHistoryKey(event)) {
      return false;
    }

    event.preventDefault();

    if (event.repeat) {
      return true;
    }

    if (
      current.isRangeMode ||
      plainText(current.element) === current.original
    ) {
      deps.post({ redo: event.shiftKey, type: "history-key" });
    } else if (event.shiftKey) {
      document.execCommand("redo");
    } else {
      document.execCommand("undo");
    }

    return true;
  };

  const onKeyDown = (event: KeyboardEvent): boolean => {
    if (!session) {
      return false;
    }

    if (onHistoryKey(session, event)) {
      event.stopImmediatePropagation();

      return true;
    }

    const plain =
      !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

    if (range.onKey(event)) {
      event.stopImmediatePropagation();

      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      if (!event.repeat) {
        commit();
      }
    } else if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey || plain)
    ) {
      event.preventDefault();

      if (!event.repeat) {
        commit();
      }
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
    }

    event.stopImmediatePropagation();

    return true;
  };

  return {
    editing: () => session !== null,
    owns: (element) =>
      session !== null && element !== null && session.element.contains(element),
    holdFor: (element) => {
      if (
        session === null ||
        !(
          element.contains(session.element) || session.element.contains(element)
        )
      ) {
        return false;
      }

      session.isHeld = true;

      return true;
    },
    allow: (on) => {
      allowed = on;

      if (!on) {
        cancel();
      }
    },
    canEdit,
    start,
    resume,
    commit,
    cancel,
    onKeyDown,
  };
}
