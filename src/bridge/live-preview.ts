import {
  DIRECT_STYLE_PROPERTIES,
  TOKEN_PREVIEW_STYLE_ID,
} from "../shared/contracts.js";
import { LOFI_STYLE_ID } from "../shared/lofi.js";
import { TWEAKS_PREVIEW_STYLE_ID } from "../shared/tweaks.js";
import { isObject, isString } from "./dom-input.js";
import type { Released } from "./optimistic.js";

type StyledElement = HTMLElement | SVGElement;

interface StyleBackup {
  hadAttribute: boolean;
  attribute: string | null;
  props: Map<string, { priority: string; value: string }>;
}

interface LivePreview {
  previewStyle(selector: unknown, style: unknown): void;
  previewText(selector: unknown, text: unknown): void;
  reset(): void;
  authoredInline(element: Element): string;
  release(element: StyledElement, props: string[], text: boolean): Released;
  previewing(element: Element): boolean;
}

const PREVIEW_STYLE_KEYS = new Set<string>(DIRECT_STYLE_PROPERTIES);
const MAX_PREVIEW_VALUE = 200;
const MAX_PREVIEW_TEXT = 5000;
const NON_TEXT_TAGS = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "textarea",
  "img",
  "input",
  "br",
  "hr",
  "svg",
]);

function queryPreviewTarget(selector: unknown): Element | null {
  if (!isString(selector) || selector === "") return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function isStyledElement(element: Element | null): element is StyledElement {
  return element instanceof HTMLElement || element instanceof SVGElement;
}

function isPreviewValue(value: unknown): value is string | null {
  return (
    value === null || (isString(value) && value.length <= MAX_PREVIEW_VALUE)
  );
}

function previewEntries(style: unknown): [string, string | null][] {
  if (!isObject(style) || Array.isArray(style)) return [];
  return Object.entries(style as Record<string, unknown>).filter(
    (entry): entry is [string, string | null] =>
      PREVIEW_STYLE_KEYS.has(entry[0]) && isPreviewValue(entry[1])
  );
}

function restoreStyle(element: StyledElement, backup: StyleBackup): void {
  for (const [prop, original] of backup.props) {
    if (original.value === "") element.style.removeProperty(prop);
    else element.style.setProperty(prop, original.value, original.priority);
  }
  if (!backup.hadAttribute && element.getAttribute("style") === "")
    element.removeAttribute("style");
}

function releaseBackup(
  styleBackups: Map<StyledElement, StyleBackup>,
  textBackups: Map<Element, Node[]>,
  element: StyledElement,
  props: string[],
  text: boolean
): Released {
  const backup = styleBackups.get(element);
  const taken = new Map<string, { priority: string; value: string }>();
  for (const prop of props) {
    const original = backup?.props.get(prop);
    if (!original || !backup) continue;
    taken.set(prop, original);
    backup.props.delete(prop);
  }
  if (backup && backup.props.size === 0) styleBackups.delete(element);
  let saved: Node[] | null = null;
  if (text) saved = textBackups.get(element) ?? null;
  let textNodes: Node[] | null = null;
  if (saved && saved.length === 1 && saved[0] instanceof Text)
    textNodes = saved;
  if (textNodes) textBackups.delete(element);
  return {
    hadAttribute: backup?.hadAttribute ?? null,
    props: taken,
    textNodes,
  };
}

function createLivePreview(): LivePreview {
  const styleBackups = new Map<StyledElement, StyleBackup>();
  const textBackups = new Map<Element, Node[]>();

  const backupFor = (element: StyledElement): StyleBackup => {
    const existing = styleBackups.get(element);
    if (existing) return existing;
    const created: StyleBackup = {
      attribute: element.getAttribute("style"),
      hadAttribute: element.hasAttribute("style"),
      props: new Map(),
    };
    styleBackups.set(element, created);
    return created;
  };

  const previewStyle = (selector: unknown, style: unknown): void => {
    const element = queryPreviewTarget(selector);
    if (!isStyledElement(element)) return;
    const entries = previewEntries(style);
    if (entries.length === 0) return;
    const backup = backupFor(element);
    for (const [prop, value] of entries) {
      if (!backup.props.has(prop)) {
        backup.props.set(prop, {
          priority: element.style.getPropertyPriority(prop),
          value: element.style.getPropertyValue(prop),
        });
      }
      if (value === null) element.style.removeProperty(prop);
      else element.style.setProperty(prop, value, "important");
    }
  };

  const previewText = (selector: unknown, text: unknown): void => {
    const element = queryPreviewTarget(selector);
    if (!element || !isString(text) || text.length > MAX_PREVIEW_TEXT) return;
    if (NON_TEXT_TAGS.has(element.tagName.toLowerCase())) return;
    if (!textBackups.has(element)) {
      if (element.children.length > 0) return;
      textBackups.set(element, [...element.childNodes]);
    }
    element.textContent = text;
  };

  const reset = (): void => {
    for (const [element, nodes] of textBackups)
      element.replaceChildren(...nodes);
    for (const [element, backup] of styleBackups) restoreStyle(element, backup);
    textBackups.clear();
    styleBackups.clear();
  };

  const authoredInline = (element: Element): string => {
    if (isStyledElement(element)) {
      const backup = styleBackups.get(element);
      if (backup) return backup.attribute ?? "";
    }
    return element.getAttribute("style") ?? "";
  };

  const release = (
    element: StyledElement,
    props: string[],
    text: boolean
  ): Released => releaseBackup(styleBackups, textBackups, element, props, text);

  const previewing = (element: Element): boolean =>
    (isStyledElement(element) && styleBackups.has(element)) ||
    textBackups.has(element);

  return {
    authoredInline,
    previewStyle,
    previewText,
    previewing,
    release,
    reset,
  };
}

const MAX_TOKEN_PREVIEW_CSS = 200_000;

type PreviewLayer = "tokens" | "tweaks" | "lofi";

const PREVIEW_LAYERS: { id: string; layer: PreviewLayer }[] = [
  { id: TOKEN_PREVIEW_STYLE_ID, layer: "tokens" },
  { id: TWEAKS_PREVIEW_STYLE_ID, layer: "tweaks" },
  { id: LOFI_STYLE_ID, layer: "lofi" },
];

interface PreviewStyles {
  apply(layer: PreviewLayer, css: unknown): void;
}

function createPreviewStyles(): PreviewStyles {
  const active: Record<PreviewLayer, string> = {
    lofi: "",
    tokens: "",
    tweaks: "",
  };
  let observer: MutationObserver | null = null;

  const element = (id: string): HTMLStyleElement | null => {
    const found = document.getElementById(id);
    if (found instanceof HTMLStyleElement) return found;
    return null;
  };

  const wanted = () =>
    PREVIEW_LAYERS.filter((item) => active[item.layer] !== "");

  const inOrder = (): boolean => {
    const items = wanted();
    let node = document.head.lastElementChild;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      if (
        !item ||
        !(node instanceof HTMLStyleElement) ||
        node.id !== item.id ||
        node.textContent !== active[item.layer]
      )
        return false;
      node = node.previousElementSibling;
    }
    return true;
  };

  const ensureOrder = (): void => {
    if (inOrder()) return;
    const head = document.head;
    for (const item of wanted()) {
      let style = element(item.id);
      if (!style) {
        style = document.createElement("style");
        style.id = item.id;
      }
      if (style.textContent !== active[item.layer])
        style.textContent = active[item.layer];
      head.appendChild(style);
    }
  };

  const watch = (): void => {
    if (observer || !("MutationObserver" in window)) return;
    observer = new MutationObserver(() => ensureOrder());
    observer.observe(document.head, { childList: true });
  };

  const apply = (layer: PreviewLayer, css: unknown): void => {
    if (!isString(css) || css.length > MAX_TOKEN_PREVIEW_CSS) return;
    active[layer] = css;
    if (!css)
      element(
        PREVIEW_LAYERS.find((item) => item.layer === layer)?.id ?? ""
      )?.remove();
    if (wanted().length === 0) {
      observer?.disconnect();
      observer = null;
      return;
    }
    ensureOrder();
    watch();
  };

  return { apply };
}

interface ThemeControl {
  set(theme: unknown): void;
}

function createThemeControl(): ThemeControl {
  let original: { dark: boolean; hadTheme: boolean; theme: string } | null =
    null;

  const restore = (): void => {
    if (!original) return;
    const root = document.documentElement;
    if (original.hadTheme) root.dataset.theme = original.theme;
    else delete root.dataset.theme;
    root.classList.toggle("dark", original.dark);
    if (root.getAttribute("class") === "") root.removeAttribute("class");
    original = null;
  };

  const set = (theme: unknown): void => {
    if (theme === null) {
      restore();
      return;
    }
    if (theme !== "light" && theme !== "dark") return;
    const root = document.documentElement;
    original ??= {
      dark: root.classList.contains("dark"),
      hadTheme: "theme" in root.dataset,
      theme: root.dataset.theme ?? "",
    };
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
  };

  return { set };
}

export {
  PREVIEW_STYLE_KEYS,
  createLivePreview,
  createPreviewStyles,
  createThemeControl,
};
