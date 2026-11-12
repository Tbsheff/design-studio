import type { BoxRect, FindingKind, PageFinding } from "./types.ts";

interface Edges {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

interface Limits {
  readonly depth: number;
  readonly ignore: string;
  readonly label: number;
  readonly overlap: number;
  readonly scope: string | null;
  readonly slack: number;
  readonly snippet: number;
  readonly textSlack: number;
  readonly tiny: number;
}

interface Measure {
  readonly amount: number;
  readonly detail: string;
  readonly kind: FindingKind;
}

interface ClipStep {
  readonly over: number;
  readonly visible: Edges | null;
}

const toBox = (rect: DOMRect): BoxRect => ({
  height: rect.height,
  width: rect.width,
  x: rect.x,
  y: rect.y,
});

const toEdges = (rect: DOMRect): Edges => ({
  bottom: rect.bottom,
  left: rect.left,
  right: rect.right,
  top: rect.top,
});

const toData = (element: Element, name: string): string | null => {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    return element.dataset[name] ?? null;
  }

  return null;
};

const toPart = (element: Element, limits: Limits): string => {
  const tag = element.tagName.toLowerCase();
  const testId = toData(element, "testid");

  if (testId !== null) {
    return `${tag}[data-testid="${testId}"]`;
  }

  if (element.id !== "") {
    return `${tag}#${element.id}`;
  }

  const classes = [...element.classList]
    .filter((name) => !name.startsWith("is-"))
    .slice(0, limits.depth)
    .map((name) => `.${name}`)
    .join("");

  const label = element.getAttribute("aria-label");

  if (label === null) {
    return `${tag}${classes}`;
  }

  return `${tag}${classes}[aria-label="${label.slice(0, limits.label)}"]`;
};

const toPathParent = (node: Element, part: string): Element | null => {
  if (part.includes("#") || part.includes("data-testid")) {
    return null;
  }

  return node.parentElement;
};

const toSelectorPath = (element: Element, limits: Limits): string => {
  const parts: string[] = [];
  let node: Element | null = element;

  while (
    node !== null &&
    node !== document.body &&
    parts.length < limits.depth
  ) {
    const part = toPart(node, limits);

    parts.unshift(part);
    node = toPathParent(node, part);
  }

  return parts.join(" > ");
};

const toSnippet = (element: Element, limits: Limits): string =>
  (element.textContent ?? "")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .slice(0, limits.snippet);

const toPageFinding = (
  measure: Measure,
  element: Element,
  limits: Limits
): PageFinding => ({
  ...measure,
  amount: Math.round(measure.amount),
  rect: toBox(element.getBoundingClientRect()),
  selector: toSelectorPath(element, limits),
  text: toSnippet(element, limits),
});

const isShown = (element: Element): boolean => {
  if (element.closest('[aria-hidden="true"], [inert]') !== null) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  return element.checkVisibility({
    checkOpacity: true,
    checkVisibilityCSS: true,
  });
};

const hasContainingProps = (style: CSSStyleDeclaration): boolean =>
  style.transform !== "none" ||
  style.filter !== "none" ||
  style.perspective !== "none" ||
  /paint|layout|strict|content/u.test(style.contain);

const isContainingBlock = (
  position: string,
  style: CSSStyleDeclaration
): boolean => {
  if (position === "fixed") {
    return hasContainingProps(style);
  }

  if (position === "absolute") {
    return style.position !== "static" || hasContainingProps(style);
  }

  return true;
};

const toInner = (node: Element): Edges => {
  const rect = node.getBoundingClientRect();
  const leftEdge = rect.left + node.clientLeft;
  const topEdge = rect.top + node.clientTop;

  return {
    bottom: topEdge + node.clientHeight,
    left: leftEdge,
    right: leftEdge + node.clientWidth,
    top: topEdge,
  };
};

const toIntersection = (first: Edges, second: Edges): Edges | null => {
  const edges = {
    bottom: Math.min(first.bottom, second.bottom),
    left: Math.max(first.left, second.left),
    right: Math.min(first.right, second.right),
    top: Math.max(first.top, second.top),
  };

  if (edges.right - edges.left <= 0 || edges.bottom - edges.top <= 0) {
    return null;
  }

  return edges;
};

const toOverflowX = (visible: Edges, inner: Edges): number =>
  Math.max(inner.left - visible.left, visible.right - inner.right);

const toOverflowY = (visible: Edges, inner: Edges): number =>
  Math.max(inner.top - visible.top, visible.bottom - inner.bottom);

const toOverflowBy = (visible: Edges, inner: Edges): number =>
  Math.max(toOverflowX(visible, inner), toOverflowY(visible, inner));

const isClipValue = (value: string): boolean =>
  value === "hidden" || value === "clip";

const toClipOver = (
  style: CSSStyleDeclaration,
  visible: Edges,
  inner: Edges
): number => {
  let over = 0;

  if (isClipValue(style.overflowX)) {
    over = toOverflowX(visible, inner);
  }

  if (isClipValue(style.overflowY)) {
    over = Math.max(over, toOverflowY(visible, inner));
  }

  return over;
};

const toClipStep = (
  node: Element,
  style: CSSStyleDeclaration,
  visible: Edges
): ClipStep => {
  if (style.overflowX === "visible" && style.overflowY === "visible") {
    return { over: 0, visible };
  }

  const inner = toInner(node);
  const next = toIntersection(visible, inner);

  if (next === null) {
    return { over: 0, visible: null };
  }

  return { over: toClipOver(style, visible, inner), visible: next };
};

const toViewportFinding = (
  element: Element,
  visible: Edges,
  limits: Limits
): PageFinding | null => {
  const viewport = {
    bottom: globalThis.innerHeight,
    left: 0,
    right: globalThis.innerWidth,
    top: 0,
  };

  const over = toOverflowBy(visible, viewport);

  if (over <= limits.slack || toIntersection(visible, viewport) === null) {
    return null;
  }

  return toPageFinding(
    {
      amount: over,
      detail: `${Math.round(over)} px past the viewport`,
      kind: "clipped",
    },
    element,
    limits
  );
};

const toNextAncestor = (element: Element): Element | null => {
  if (element.matches(":popover-open, dialog:modal")) {
    return null;
  }

  return element.parentElement;
};

const toClipFinding = (
  element: Element,
  limits: Limits
): PageFinding | null => {
  let visible: Edges | null = toEdges(element.getBoundingClientRect());
  let { position } = getComputedStyle(element);
  let node = toNextAncestor(element);

  while (node !== null && node !== document.body && visible !== null) {
    const style = getComputedStyle(node);

    if (isContainingBlock(position, style)) {
      const step = toClipStep(node, style, visible);

      if (step.over > limits.slack && step.visible !== null) {
        return toPageFinding(
          {
            amount: step.over,
            detail: `${Math.round(step.over)} px past ${toSelectorPath(node, limits)}`,
            kind: "clipped",
          },
          element,
          limits
        );
      }

      ({ visible } = step);
      ({ position } = style);
    }

    node = toNextAncestor(node);
  }

  if (visible === null) {
    return null;
  }

  return toViewportFinding(element, visible, limits);
};

export {
  hasContainingProps,
  isClipValue,
  isContainingBlock,
  isShown,
  toBox,
  toClipFinding,
  toClipStep,
  toData,
  toEdges,
  toInner,
  toIntersection,
  toNextAncestor,
  toClipOver,
  toOverflowBy,
  toOverflowX,
  toOverflowY,
  toPageFinding,
  toPart,
  toPathParent,
  toSelectorPath,
  toSnippet,
  toViewportFinding,
};

export type { Edges, Limits };
