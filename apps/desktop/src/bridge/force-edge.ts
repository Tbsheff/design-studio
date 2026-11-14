import {
  isEdgeStateName,
  toEdgePseudo,
} from "@design-studio/contracts/state-styles";
import type { EdgeStateName } from "@design-studio/contracts/state-styles";

const EDGE_STYLE_ID = "studio-force-edge";

const EDGE_ATTR = "data-studio-edge";

const EDGE_CSS = `[${EDGE_ATTR}]{outline:2px dashed oklch(0.62 0.19 255) !important;outline-offset:-2px !important;}`;

const toEdgeState = (states: readonly string[]): EdgeStateName | null =>
  states.find((state) => isEdgeStateName(state)) ?? null;

const toEdgeTargets = (
  element: Element,
  state: EdgeStateName
): readonly Element[] => {
  const parent = element.parentElement;

  if (parent === null) {
    return [];
  }

  const pseudo = `:${toEdgePseudo(state)}`;

  return Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName && child.matches(pseudo)
  );
};

const clearEdgeMarks = (): void => {
  for (const marked of Array.from(
    document.querySelectorAll(`[${EDGE_ATTR}]`)
  )) {
    marked.removeAttribute(EDGE_ATTR);
  }
};

const toEdgeStyle = (): HTMLStyleElement => {
  const existing = document.getElementById(EDGE_STYLE_ID);

  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const style = document.createElement("style");
  style.id = EDGE_STYLE_ID;
  style.textContent = EDGE_CSS;
  (document.head ?? document.documentElement).append(style);

  return style;
};

const showEdge = (element: Element | null, states: readonly string[]): void => {
  clearEdgeMarks();
  const state = toEdgeState(states);

  if (element === null || state === null) {
    document.getElementById(EDGE_STYLE_ID)?.remove();

    return;
  }

  toEdgeStyle();

  for (const target of toEdgeTargets(element, state)) {
    target.setAttribute(EDGE_ATTR, state);
  }
};

export { showEdge, toEdgeState };
