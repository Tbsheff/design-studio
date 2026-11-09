const OUTLINE_ATTR = "data-studio-outline";
const OVERLAY = '[id^="studio-"]';
const SCAN_LIMIT = 4000;
const RESCAN_MS = 250;
const LINE = "1px solid rgba(24, 160, 251, 0.85)";
const FILL = "rgba(24, 160, 251, 0.07)";
const BOXES = new Set(["flex", "inline-flex", "grid", "inline-grid"]);

interface OutlineView {
  readonly set: (isOn: boolean) => void;
}

const toPath = (element: Element): string => {
  const parts: string[] = [];
  let node: Element | null = element;

  while (node && node !== document.body) {
    const parent: Element | null = node.parentElement;

    if (!parent) {
      break;
    }

    const index = Array.prototype.indexOf.call(parent.children, node) + 1;
    parts.unshift(`*:nth-child(${index})`);
    node = parent;
  }

  return ["html>body", ...parts].join(">");
};

const isStudioNode = (element: Element): boolean =>
  element.closest(OVERLAY) !== null;

const toBoxSelectors = (): string[] => {
  const found: string[] = [];
  const all = document.body?.querySelectorAll("*") ?? [];
  const count = Math.min(all.length, SCAN_LIMIT);

  for (let index = 0; index < count; index += 1) {
    const element = all[index];

    if (
      element &&
      BOXES.has(getComputedStyle(element).display) &&
      !isStudioNode(element)
    ) {
      found.push(toPath(element));
    }
  }

  return found;
};

const toBaseCss = (): string =>
  [
    `html *:not(${OVERLAY}):not(${OVERLAY} *):not(script):not(style):not(head):not(head *) { outline: ${LINE} !important; outline-offset: -1px !important; }`,
  ].join("\n");

const toCss = (selectors: readonly string[]): string => {
  if (selectors.length === 0) {
    return toBaseCss();
  }

  const rule = `${selectors.join(",\n")} { background-image: linear-gradient(${FILL}, ${FILL}) !important; }`;

  return `${toBaseCss()}\n${rule}`;
};

const toStyleTag = (): HTMLStyleElement => {
  const existing = document.head.querySelector(`style[${OUTLINE_ATTR}]`);

  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const created = document.createElement("style");
  created.setAttribute(OUTLINE_ATTR, "");
  document.head.append(created);

  return created;
};

const createOutlineView = (): OutlineView => {
  let observer: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isOn = false;

  const paint = (): void => {
    if (!isOn) {
      return;
    }

    const css = toCss(toBoxSelectors());
    const tag = toStyleTag();

    if (tag.textContent !== css) {
      tag.textContent = css;
    }
  };

  const schedule = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = setTimeout(paint, RESCAN_MS);
  };

  const stop = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    observer?.disconnect();
    observer = null;
    document.head.querySelector(`style[${OUTLINE_ATTR}]`)?.remove();
  };

  const start = (): void => {
    paint();

    if (!observer && document.body && "MutationObserver" in globalThis) {
      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  const set = (next: boolean): void => {
    isOn = next;

    if (next) {
      start();

      return;
    }

    stop();
  };

  return { set };
};

export { createOutlineView };

export type { OutlineView };
