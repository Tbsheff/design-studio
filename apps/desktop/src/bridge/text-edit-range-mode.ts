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

const isInlineTextChild = (element: Element): boolean =>
  element instanceof HTMLElement &&
  INLINE_TAGS.has(element.tagName.toLowerCase()) &&
  element.children.length === 0;

const isMixedLayer = (element: Element): boolean =>
  element.children.length > 0 &&
  [...element.children].every((child) => isInlineTextChild(child));

const toSnapshot = (element: HTMLElement): NodeSnapshot => {
  const children = new Map<Node, readonly Node[]>();
  const data = new Map<Node, string>();
  const parents: Node[] = [element, ...element.children];

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

const toTextPoint = (element: HTMLElement, at: number): TextPoint | null => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let left = at;
  let node = walker.nextNode();

  while (node instanceof Text) {
    if (left <= node.data.length) {
      return { node, offset: left };
    }

    left -= node.data.length;
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

const toMixedParentOf = (element: Element | null): HTMLElement | null => {
  const parent = element?.parentElement ?? null;

  if (
    element === null ||
    parent === null ||
    !isInlineTextChild(element) ||
    !isMixedLayer(parent)
  ) {
    return null;
  }

  return parent;
};

const selectChildText = (parent: HTMLElement, child: Element): boolean => {
  const before = document.createRange();
  before.selectNodeContents(parent);
  before.setEndBefore(child);
  const start = before.toString().length;

  return selectTextRange(
    parent,
    start,
    start + (child.textContent ?? "").length
  );
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
  for (const child of element.children) {
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
  toSnapshot,
};

export type { NodeSnapshot };
