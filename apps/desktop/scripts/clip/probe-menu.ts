import {
  isShown,
  toEdges,
  toIntersection,
  toOverflowBy,
  toPageFinding,
} from "./probe.ts";
import type { Edges, Limits } from "./probe.ts";
import type { PageFinding } from "./types.ts";

const toPanelCut = (bounds: Edges): Edges => {
  const panel = document.querySelector(
    '.studio[data-inspector="open"] .studio-inspector'
  );

  if (panel === null || !isShown(panel)) {
    return bounds;
  }

  const { left } = panel.getBoundingClientRect();

  return { ...bounds, right: Math.min(bounds.right, left) };
};

const toToolsCut = (bounds: Edges): Edges => {
  const tools = document.querySelector(".studio-tools > .topbar-tools");

  if (tools === null || !isShown(tools)) {
    return bounds;
  }

  const bar = tools.getBoundingClientRect();

  if (bar.width >= bar.height) {
    return { ...bounds, bottom: Math.min(bounds.bottom, bar.top) };
  }

  return { ...bounds, left: Math.max(bounds.left, bar.right) };
};

const toStageBounds = (stage: Element): Edges | null => {
  const bounds = toIntersection(toEdges(stage.getBoundingClientRect()), {
    bottom: innerHeight,
    left: 0,
    right: innerWidth,
    top: 0,
  });

  if (bounds === null) {
    return null;
  }

  return toToolsCut(toPanelCut(bounds));
};

const toStageMenuFinding = (
  element: Element,
  limits: Limits
): PageFinding | null => {
  const stage = element.closest(limits.ignore);
  const bounds = stage && toStageBounds(stage);

  if (!bounds) {
    return null;
  }

  const over = toOverflowBy(toEdges(element.getBoundingClientRect()), bounds);

  if (over <= limits.slack) {
    return null;
  }

  return toPageFinding(
    {
      amount: over,
      detail: `canvas menu runs ${Math.round(over)} px past the visible stage`,
      kind: "clipped",
    },
    element,
    limits
  );
};

const toItemFindings = (menu: Element, limits: Limits): PageFinding[] =>
  [...menu.querySelectorAll('[role="menuitem"]')].flatMap((item) => {
    const finding = isShown(item) && toStageMenuFinding(item, limits);

    if (finding) {
      return [finding];
    }

    return [];
  });

const toStageMenuFindings = (limits: Limits): PageFinding[] =>
  [...document.querySelectorAll(`${limits.ignore} [role="menu"]`)].flatMap(
    (menu) => {
      if (!isShown(menu)) {
        return [];
      }

      const finding = toStageMenuFinding(menu, limits);

      if (finding !== null) {
        return [finding];
      }

      return toItemFindings(menu, limits);
    }
  );

export {
  toItemFindings,
  toPanelCut,
  toStageBounds,
  toStageMenuFinding,
  toStageMenuFindings,
  toToolsCut,
};
