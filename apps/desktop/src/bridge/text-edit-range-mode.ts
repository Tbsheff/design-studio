interface NodeSnapshot {
  readonly children: ReadonlyMap<Node, readonly Node[]>;
  readonly data: ReadonlyMap<Node, string>;
}

interface RangeGuardSetup {
  readonly element: HTMLElement;
  readonly onBlocked: () => void;
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

const preventEvent = (event: Event): void => {
  event.preventDefault();
};

const createRangeGuard = (setup: RangeGuardSetup): (() => void) => {
  const { element, onBlocked, snapshot } = setup;
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
    restoreSnapshot(snapshot);
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

export {
  createRangeGuard,
  isInlineTextChild,
  isMixedLayer,
  restoreSnapshot,
  selectTextRange,
  toSnapshot,
};

export type { NodeSnapshot };
