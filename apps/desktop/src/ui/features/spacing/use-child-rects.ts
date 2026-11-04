import { useEffect, useState } from "react";

import type { BridgeToParent, ParentMessageBody } from "./deps.js";
import { mergeRects } from "./spacing-model.js";
import type { Rect } from "./spacing-model.js";

interface ChildPort {
  readonly listen?: (handler: (message: BridgeToParent) => void) => () => void;
  readonly post: (body: ParentMessageBody) => void;
}

interface ChildState {
  readonly key: string;
  readonly rects: readonly Rect[];
}

const EDGES = [":first-child", ":last-child"] as const;
const NONE: readonly Rect[] = [];

let childSeq = 0;

const nextId = (): string => {
  childSeq += 1;

  return `sp-${childSeq}`;
};

const rectKey = (rect: Rect | null): string => {
  if (!rect) {
    return "";
  }

  return `${rect.x},${rect.y},${rect.width},${rect.height}`;
};

const useChildRects = (
  port: ChildPort,
  selector: string | null,
  rect: Rect | null,
  active: boolean
): readonly Rect[] => {
  const [state, setState] = useState<ChildState>({ key: "", rects: NONE });
  const key = `${selector ?? ""}@${rectKey(rect)}`;
  const { listen, post } = port;

  useEffect(() => {
    if (!active || !selector || !listen) {
      return;
    }

    const found = new Map<string, readonly Rect[]>();
    const ids = new Map(EDGES.map((edge) => [nextId(), edge]));

    const stop = listen((message) => {
      if (message.type !== "neighbors" || !ids.has(message.requestId)) {
        return;
      }

      found.set(message.requestId, message.siblings);

      if (found.size === ids.size) {
        setState({ key, rects: mergeRects([...found.values()]) });
        stop();
      }
    });

    for (const [requestId, edge] of ids) {
      post({
        requestId,
        selector: `${selector} > ${edge}`,
        type: "request-neighbors",
      });
    }

    return stop;
  }, [active, key, listen, post, selector]);

  if (state.key !== key) {
    return NONE;
  }

  return state.rects;
};

export { useChildRects };

export type { ChildPort };
