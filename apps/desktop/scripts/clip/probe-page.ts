import {
  toItemFindings,
  toPanelCut,
  toStageBounds,
  toStageMenuFinding,
  toStageMenuFindings,
  toToolsCut,
} from "./probe-menu.ts";
import {
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
} from "./probe.ts";
import type { Edges, Limits } from "./probe.ts";
import type { PageFinding } from "./types.ts";

const isScrollValue = (value: string): boolean =>
  value === "auto" || value === "scroll";

const hasOwnText = (element: Element): boolean =>
  [...element.childNodes].some(
    (child) =>
      child.nodeType === Node.TEXT_NODE &&
      (child.textContent ?? "").trim() !== ""
  );

const isBlockBox = (style: CSSStyleDeclaration): boolean =>
  style.display !== "inline" &&
  style.display !== "contents" &&
  !isScrollValue(style.overflowX) &&
  !isScrollValue(style.overflowY);

const isTextBox = (element: Element, style: CSSStyleDeclaration): boolean =>
  hasOwnText(element) &&
  isBlockBox(style) &&
  element.closest(
    'input, textarea, select, [contenteditable="true"], .cm-editor'
  ) === null;

const toTextRects = (element: Element): DOMRect[] => {
  const rects: DOMRect[] = [];

  for (const child of element.childNodes) {
    if (
      child.nodeType === Node.TEXT_NODE &&
      (child.textContent ?? "").trim() !== ""
    ) {
      const range = document.createRange();

      range.selectNodeContents(child);
      rects.push(...range.getClientRects());
    }
  }

  return rects;
};

const toTextEdges = (element: Element): Edges | null => {
  const rects = toTextRects(element).filter(
    (rect) => rect.width > 0 && rect.height > 0
  );

  if (rects.length === 0) {
    return null;
  }

  return {
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    top: Math.min(...rects.map((rect) => rect.top)),
  };
};

const isTinyBox = (element: Element, limits: Limits): boolean =>
  element.clientWidth <= limits.tiny || element.clientHeight <= limits.tiny;

const toTextFinding = (
  element: Element,
  limits: Limits
): PageFinding | null => {
  const style = getComputedStyle(element);
  const text = toTextEdges(element);

  if (
    !isTextBox(element, style) ||
    isTinyBox(element, limits) ||
    text === null
  ) {
    return null;
  }

  const inner = toInner(element);
  const overX = toOverflowX(text, inner);

  if (
    element.scrollWidth - element.clientWidth > limits.slack &&
    overX > limits.textSlack &&
    style.textOverflow !== "ellipsis"
  ) {
    return toPageFinding(
      {
        amount: overX,
        detail: `text runs ${Math.round(overX)} px past a ${element.clientWidth} px wide box, no ellipsis`,
        kind: "text-overflow",
      },
      element,
      limits
    );
  }

  const overY = toOverflowY(text, inner);

  if (
    element.scrollHeight - element.clientHeight > limits.slack &&
    overY > limits.textSlack &&
    style.webkitLineClamp === "none"
  ) {
    return toPageFinding(
      {
        amount: overY,
        detail: `text runs ${Math.round(overY)} px past a ${element.clientHeight} px high box, no line clamp`,
        kind: "text-overflow",
      },
      element,
      limits
    );
  }

  return null;
};

const isSidewaysIntended = (element: Element): boolean =>
  element.matches(
    '[role="tablist"], [role="toolbar"], [role="scrollbar"], [aria-orientation="horizontal"], [data-scroll="x"], textarea, input, .cm-scroller'
  );

const toSidewaysFinding = (
  element: Element,
  limits: Limits
): PageFinding | null => {
  const style = getComputedStyle(element);
  const over = element.scrollWidth - element.clientWidth;

  if (
    !isScrollValue(style.overflowX) ||
    over <= limits.slack ||
    isSidewaysIntended(element)
  ) {
    return null;
  }

  return toPageFinding(
    {
      amount: over,
      detail: `scrolls sideways: content ${element.scrollWidth} px in ${element.clientWidth} px`,
      kind: "sideways-scroll",
    },
    element,
    limits
  );
};

const isHitTarget = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();

  const hit = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );

  return hit !== null && (hit === element || element.contains(hit));
};

const toOverlapFinding = (
  first: Element,
  second: Element,
  limits: Limits
): PageFinding | null => {
  if (first.contains(second) || second.contains(first)) {
    return null;
  }

  const one = first.getBoundingClientRect();
  const two = second.getBoundingClientRect();
  const width = Math.min(one.right, two.right) - Math.max(one.left, two.left);
  const height = Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top);

  if (width <= limits.overlap || height <= limits.overlap) {
    return null;
  }

  return {
    ...toPageFinding(
      {
        amount: Math.min(width, height),
        detail: `overlaps ${toSelectorPath(second, limits)} by ${Math.round(width)} x ${Math.round(height)} px`,
        kind: "overlap",
      },
      first,
      limits
    ),
    text: `${toSnippet(first, limits)} | ${toSnippet(second, limits)}`,
  };
};

const toOverlapFindings = (limits: Limits): PageFinding[] => {
  const groups = new Map<Element | null, Element[]>();

  const targets = [
    ...document.querySelectorAll(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="menuitem"], [role="tab"]'
    ),
  ].filter((element) => isShown(element) && isHitTarget(element));

  for (const element of targets) {
    const root = element.closest(
      '[role="menu"], [role="dialog"], [role="listbox"], dialog, [popover], .ui-menu'
    );

    groups.set(root, [...(groups.get(root) ?? []), element]);
  }

  return [...groups.values()].flatMap((group) =>
    group.flatMap((first, index) =>
      group
        .slice(index + 1)
        .map((second) => toOverlapFinding(first, second, limits))
        .filter((finding) => finding !== null)
    )
  );
};

const isCandidate = (element: Element): boolean =>
  !(element instanceof SVGElement && !(element instanceof SVGSVGElement)) &&
  !element.matches("script, style, template, br, noscript, link, meta") &&
  isShown(element);

const toCandidates = (limits: Limits): Element[] => {
  if (limits.scope === null) {
    return [...document.querySelectorAll("body *")].filter((element) =>
      isCandidate(element)
    );
  }

  const roots = [...document.querySelectorAll(limits.scope)];
  const inner = roots.flatMap((root) => [...root.querySelectorAll("*")]);

  return [...roots, ...inner].filter((element) => isCandidate(element));
};

const inspectPage = (limits: Limits): PageFinding[] => {
  const findings: PageFinding[] = [];
  const clipped = new Set<Element>();

  const hasClippedAncestor = (element: Element): boolean =>
    [...clipped].some((other) => other.contains(element));

  for (const element of toCandidates(limits)) {
    const clip = toClipFinding(element, limits);

    if (
      clip !== null &&
      element.closest(limits.ignore) === null &&
      !hasClippedAncestor(element)
    ) {
      clipped.add(element);
      findings.push(clip);
    }

    findings.push(
      ...[
        toTextFinding(element, limits),
        toSidewaysFinding(element, limits),
      ].filter((finding) => finding !== null)
    );
  }

  if (limits.scope === null) {
    findings.push(...toOverlapFindings(limits), ...toStageMenuFindings(limits));
  }

  return findings;
};

const toTipProbe = (host: Element): HTMLElement | null => {
  const after = getComputedStyle(host, "::after");

  if (
    after.content === "none" ||
    after.content === "normal" ||
    after.opacity === "0"
  ) {
    return null;
  }

  const probe = document.createElement("span");

  for (const name of after) {
    probe.style.setProperty(name, after.getPropertyValue(name));
  }

  probe.style.setProperty("transition", "none");
  probe.style.setProperty("animation", "none");
  probe.textContent = toData(host, "tip") ?? "";
  host.append(probe);

  return probe;
};

const inspectTip = (limits: Limits): PageFinding[] => {
  const host = document.querySelector("[data-clip-target]");

  if (host === null) {
    return [];
  }

  const probe = toTipProbe(host);

  if (probe === null) {
    return inspectPage(limits);
  }

  const finding = toClipFinding(probe, limits);

  probe.remove();

  if (finding === null) {
    return inspectPage(limits);
  }

  return [
    {
      ...finding,
      selector: `${toSelectorPath(host, limits)}::after`,
      text: toData(host, "tip") ?? "",
    },
    ...inspectPage(limits),
  ];
};

interface MarkOptions {
  readonly attribute: string;
  readonly limits: Limits;
  readonly selector: string;
}

const setTargets = (options: MarkOptions): string[] => {
  for (const old of document.querySelectorAll(`[${options.attribute}]`)) {
    old.removeAttribute(options.attribute);
  }

  const targets = [...document.querySelectorAll(options.selector)].filter(
    (element) => isShown(element) && isHitTarget(element)
  );

  return targets.map((element, index) => {
    element.setAttribute(options.attribute, String(index));

    return `${toSelectorPath(element, options.limits)} ${toData(element, "tip") ?? ""}`.trim();
  });
};

const IN_PAGE = [
  toData,
  toPathParent,
  toBox,
  toEdges,
  toPart,
  toSelectorPath,
  toSnippet,
  toPageFinding,
  isShown,
  hasContainingProps,
  isContainingBlock,
  toInner,
  toIntersection,
  toOverflowX,
  toOverflowY,
  toOverflowBy,
  isClipValue,
  toClipOver,
  toClipStep,
  toViewportFinding,
  toNextAncestor,
  toClipFinding,
  isScrollValue,
  hasOwnText,
  isBlockBox,
  isTextBox,
  toTextRects,
  toTextEdges,
  isTinyBox,
  toTextFinding,
  isSidewaysIntended,
  toSidewaysFinding,
  isHitTarget,
  toOverlapFinding,
  toOverlapFindings,
  toPanelCut,
  toToolsCut,
  toStageBounds,
  toStageMenuFinding,
  toItemFindings,
  toStageMenuFindings,
  isCandidate,
  toCandidates,
  inspectPage,
  toTipProbe,
  inspectTip,
  setTargets,
];

const toPageExpression = (
  entry: "inspectPage" | "inspectTip" | "setTargets",
  argument: Limits | MarkOptions
): string => {
  const body = IN_PAGE.map(
    (inPage) => `const ${inPage.name} = ${inPage.toString()};`
  ).join("\n");

  return `(() => { const __name = (target) => target;\n${body}\nreturn ${entry}(${JSON.stringify(argument)}); })()`;
};

export { toPageExpression };

export type { MarkOptions };
