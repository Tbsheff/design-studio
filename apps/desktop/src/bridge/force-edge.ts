import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
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

const isSameSource = (
  child: Element,
  element: Element,
  loc: string | null
): boolean => {
  if (loc === null) {
    return child === element;
  }

  return child.getAttribute(SOURCE_LOC_ATTR) === loc;
};

const toEdgeTargets = (
  element: Element,
  state: EdgeStateName
): readonly Element[] => {
  const parent = element.parentElement;

  if (parent === null) {
    return [];
  }

  const pseudo = `:${toEdgePseudo(state)}`;
  const loc = element.getAttribute(SOURCE_LOC_ATTR);

  return [...parent.children].filter(
    (child) => isSameSource(child, element, loc) && child.matches(pseudo)
  );
};

const clearEdgeMarks = (): void => {
  for (const marked of document.querySelectorAll(`[${EDGE_ATTR}]`)) {
    marked.removeAttribute(EDGE_ATTR);
  }
};

const toEdgeStyle = (): HTMLStyleElement => {
  const existing = document.querySelector(`#${EDGE_STYLE_ID}`);

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
    document.querySelector(`#${EDGE_STYLE_ID}`)?.remove();

    return;
  }

  toEdgeStyle();

  for (const target of toEdgeTargets(element, state)) {
    target.setAttribute(EDGE_ATTR, state);
  }
};

export { showEdge, toEdgeState };
