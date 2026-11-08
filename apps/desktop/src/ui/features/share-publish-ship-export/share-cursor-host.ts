import type { SharePresenceCursor } from "@design-studio/contracts/share";

import { toCursorNode, toHue } from "./share-cursor-node.js";
import type { CursorNode } from "./share-cursor-node.js";

interface CursorHost {
  readonly clear: () => void;
  readonly ensure: (root: HTMLElement) => HTMLDivElement;
  readonly prune: (isKept: (key: string) => boolean) => void;
  readonly toNode: (
    key: string,
    cursor: SharePresenceCursor,
    layer: HTMLDivElement
  ) => CursorNode;
}

const createCursorHost = (): CursorHost => {
  const nodes = new Map<string, CursorNode>();
  const state = { layer: null as HTMLDivElement | null };

  const clear = (): void => {
    state.layer?.remove();
    state.layer = null;
    nodes.clear();
  };

  return {
    clear,
    ensure: (root: HTMLElement): HTMLDivElement => {
      if (state.layer && state.layer.parentElement === root) {
        return state.layer;
      }

      clear();
      const layer = document.createElement("div");
      layer.className = "share-cursors";
      layer.setAttribute("aria-hidden", "true");
      root.append(layer);
      state.layer = layer;

      return layer;
    },
    prune: (isKept: (key: string) => boolean): void => {
      for (const [key, node] of nodes) {
        if (!isKept(key)) {
          node.element.remove();
          nodes.delete(key);
        }
      }
    },
    toNode: (key, cursor, layer): CursorNode => {
      const existing = nodes.get(key);
      const node = existing ?? toCursorNode(toHue(cursor.viewer));

      if (!existing) {
        layer.append(node.element);
        nodes.set(key, node);
      }

      node.setName(cursor.name);

      return node;
    },
  };
};

export { createCursorHost };

export type { CursorHost };
