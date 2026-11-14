import { appSourceFor } from "./app-source.js";

interface NodeSnapshot {
  readonly children: ReadonlyMap<Node, readonly Node[]>;
  readonly data: ReadonlyMap<Node, string>;
}

interface EditGuardSetup {
  readonly element: HTMLElement;
  readonly isRangeMode: boolean;
  readonly onBlocked: () => void;
  readonly onOuterChange: () => void;
  readonly snapshot: NodeSnapshot;
}

interface TextPoint {
  readonly node: Node;
  readonly offset: number;
}

const INLINE_TAGS = new Set([
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "span",
  "code",
  "mark",
  "small",
  "sub",
  "sup",
]);

const BLOCKED_EVENTS = ["paste", "cut", "drop", "dragover"] as const;

const NEST_DEPTH_MAX = 3;

const INLINE_DISPLAYS = new Set(["contents", "inline", "inline-block"]);

const isBreak = (element: Element): boolean => element instanceof HTMLBRElement;

const isInlineDisplay = (element: HTMLElement): boolean =>
  INLINE_DISPLAYS.has(getComputedStyle(element).display);

const isInlineTree = (element: Element, depth: number): boolean =>
  element instanceof HTMLElement &&
  INLINE_TAGS.has(element.tagName.toLowerCase()) &&
  isInlineDisplay(element) &&
  [...element.children].every(
    (child) =>
      isBreak(child) ||
      (depth < NEST_DEPTH_MAX && isInlineTree(child, depth + 1))
  );

const isInlineTextChild = (element: Element): boolean =>
  isInlineTree(element, 1);

const isMixedLayer = (element: Element): boolean =>
  element.children.length > 0 &&
  [...element.children].every(
    (child) => isBreak(child) || isInlineTextChild(child)
  );

const toSnapshot = (element: HTMLElement): NodeSnapshot => {
  const children = new Map<Node, readonly Node[]>();
  const data = new Map<Node, string>();
  const parents: Node[] = [element, ...element.querySelectorAll("*")];

  for (const parent of parents) {
    const nodes = [...parent.childNodes];
    children.set(parent, nodes);

    for (const node of nodes) {
      if (node instanceof CharacterData) {
        data.set(node, node.data);
      }
    }
  }

  return { children, data };
};

const restoreSnapshot = (snapshot: NodeSnapshot): void => {
  for (const [parent, nodes] of snapshot.children) {
    if (parent instanceof Element) {
      parent.replaceChildren(...nodes);
    }
  }

  for (const [node, data] of snapshot.data) {
    if (node instanceof CharacterData && node.data !== data) {
      node.data = data;
    }
  }
};

const toStepOf = (node: Node): number => {
  if (node instanceof Text) {
    return node.data.length;
  }

  if (node instanceof HTMLBRElement) {
    return 1;
  }

  return 0;
};

const toPlainLength = (node: Node): number => {
  if (node instanceof Text || node instanceof HTMLBRElement) {
    return toStepOf(node);
  }

  let length = 0;

  for (const child of node.childNodes) {
    length += toPlainLength(child);
  }

  return length;
};

const toPlainOffset = (
  element: HTMLElement,
  node: Node,
  offset: number
): number => {
  const before = document.createRange();
  before.selectNodeContents(element);
  before.setEnd(node, offset);

  return toPlainLength(before.cloneContents());
};

const toBreakPoint = (node: HTMLBRElement): TextPoint | null => {
  const parent = node.parentNode;

  if (parent === null) {
    return null;
  }

  return { node: parent, offset: [...parent.childNodes].indexOf(node) };
};

const toTextPoint = (element: HTMLElement, at: number): TextPoint | null => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL);

  let left = at;
  let node = walker.nextNode();

  while (node !== null) {
    if (node instanceof Text && left <= node.data.length) {
      return { node, offset: left };
    }

    if (node instanceof HTMLBRElement && left === 0) {
      return toBreakPoint(node);
    }

    left -= toStepOf(node);
    node = walker.nextNode();
  }

  return null;
};

const selectTextRange = (
  element: HTMLElement,
  start: number,
  end: number
): boolean => {
  const head = toTextPoint(element, start);
  const tail = toTextPoint(element, end);
  const selection = globalThis.getSelection();

  if (head === null || tail === null || selection === null) {
    return false;
  }

  const range = document.createRange();
  range.setStart(head.node, head.offset);
  range.setEnd(tail.node, tail.offset);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
};

const isInlineTag = (element: Element): boolean =>
  INLINE_TAGS.has(element.tagName.toLowerCase());

const toMixedParentOf = (element: Element | null): HTMLElement | null => {
  let current = element;
  let found: HTMLElement | null = null;

  for (let depth = 0; depth < NEST_DEPTH_MAX; depth += 1) {
    const parent = current?.parentElement ?? null;

    if (current === null || parent === null || !isInlineTag(current)) {
      break;
    }

    if (isMixedLayer(parent)) {
      found = parent;
    }

    current = parent;
  }

  return found;
};

const toChildStart = (parent: HTMLElement, child: Element): number => {
  const holder = child.parentNode;

  if (holder === null) {
    return 0;
  }

  return toPlainOffset(parent, holder, [...holder.childNodes].indexOf(child));
};

const selectChildText = (parent: HTMLElement, child: Element): boolean => {
  const start = toChildStart(parent, child);

  return selectTextRange(parent, start, start + toPlainLength(child));
};

const preventEvent = (event: Event): void => {
  event.preventDefault();
};

const isOuterNode = (node: Node): boolean =>
  node instanceof Element && !(node instanceof HTMLBRElement);

const isOuterChange = (records: readonly MutationRecord[]): boolean =>
  records.some(
    (record) =>
      [...record.addedNodes].some((node) => isOuterNode(node)) ||
      [...record.removedNodes].some((node) => isOuterNode(node))
  );

const toInputBlock = (
  setup: EditGuardSetup,
  restore: () => void
): (() => void) => {
  const { element, onBlocked } = setup;
  let hasBlocked = false;

  const block = (): void => {
    if (!hasBlocked) {
      hasBlocked = true;
      onBlocked();
    }
  };

  const onBeforeInput = (event: InputEvent): void => {
    event.preventDefault();
    block();
  };

  const onInput = (): void => {
    restore();
    block();
  };

  element.addEventListener("beforeinput", onBeforeInput);
  element.addEventListener("input", onInput);

  for (const type of BLOCKED_EVENTS) {
    element.addEventListener(type, preventEvent);
  }

  return () => {
    element.removeEventListener("beforeinput", onBeforeInput);
    element.removeEventListener("input", onInput);

    for (const type of BLOCKED_EVENTS) {
      element.removeEventListener(type, preventEvent);
    }
  };
};

const primeChildSources = (element: HTMLElement): void => {
  for (const child of element.querySelectorAll("*")) {
    void appSourceFor(child);
  }
};

const createEditGuard = (setup: EditGuardSetup): (() => void) => {
  const observer = new MutationObserver((records) => {
    if (isOuterChange(records)) {
      setup.onOuterChange();
    }
  });

  const restore = (): void => {
    restoreSnapshot(setup.snapshot);
    observer.takeRecords();
  };

  observer.observe(setup.element, { childList: true, subtree: true });
  let releaseBlock: (() => void) | null = null;

  if (setup.isRangeMode) {
    releaseBlock = toInputBlock(setup, restore);
    primeChildSources(setup.element);
  }

  return () => {
    observer.disconnect();
    releaseBlock?.();
  };
};

export {
  createEditGuard,
  isInlineTextChild,
  isMixedLayer,
  restoreSnapshot,
  selectChildText,
  selectTextRange,
  toMixedParentOf,
  toPlainOffset,
  toSnapshot,
};

export type { NodeSnapshot };
