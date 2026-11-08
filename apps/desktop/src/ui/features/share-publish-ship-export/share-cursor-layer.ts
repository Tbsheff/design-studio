import type { SharePresenceCursor } from "@design-studio/contracts/share";

import { createCursorHost } from "./share-cursor-host.js";
import { toCursorKey } from "./share-cursor-node.js";
import { createFrameLookup, placeCursor } from "./share-frame-lookup.js";

interface CursorLayer {
  readonly destroy: () => void;
  readonly drop: (linkId: string, viewer: string) => void;
  readonly put: (cursor: SharePresenceCursor) => void;
  readonly set: (list: readonly SharePresenceCursor[]) => void;
}

const createCursorLayer = (stage: () => HTMLElement | null): CursorLayer => {
  const cursors = new Map<string, SharePresenceCursor>();
  const host = createCursorHost();
  const lookup = createFrameLookup();
  const state = { raf: 0 };

  const paint = (): void => {
    state.raf = 0;
    const root = stage();

    if (!root || cursors.size === 0) {
      host.clear();

      return;
    }

    const layer = host.ensure(root);
    const box = root.getBoundingClientRect();
    host.prune((key) => cursors.has(key));

    for (const [key, cursor] of cursors) {
      const node = host.toNode(key, cursor, layer);
      placeCursor(node, lookup.toFrame(root, cursor), cursor, box);
    }

    state.raf = globalThis.requestAnimationFrame(() => {
      paint();
    });
  };

  const kick = (): void => {
    if (!state.raf) {
      state.raf = globalThis.requestAnimationFrame(() => {
        paint();
      });
    }
  };

  return {
    destroy: (): void => {
      globalThis.cancelAnimationFrame(state.raf);
      host.clear();
      lookup.clear();
    },
    drop: (linkId: string, viewer: string): void => {
      cursors.delete(toCursorKey(linkId, viewer));
      kick();
    },
    put: (cursor: SharePresenceCursor): void => {
      cursors.set(toCursorKey(cursor.linkId, cursor.viewer), cursor);
      kick();
    },
    set: (list: readonly SharePresenceCursor[]): void => {
      cursors.clear();

      for (const cursor of list) {
        cursors.set(toCursorKey(cursor.linkId, cursor.viewer), cursor);
      }

      kick();
    },
  };
};

export { createCursorLayer };

export type { CursorLayer };
