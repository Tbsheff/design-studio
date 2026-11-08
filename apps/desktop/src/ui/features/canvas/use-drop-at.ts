import { useCallback, useEffect, useRef } from "react";

import type { Drop, Point, VectorLayerProps } from "./vector-layer-types.js";

const DROP_WAIT_MS = 1500;

interface DropWaiter {
  nextId: number;
  waiting: Map<string, (drop: Drop) => void>;
}

const useDropAt = (
  post: VectorLayerProps["post"],
  listen: VectorLayerProps["listen"]
): ((point: Point) => Promise<Drop>) => {
  const waiter = useRef<DropWaiter>({ nextId: 0, waiting: new Map() });

  useEffect(
    () =>
      listen((message) => {
        if (message.type !== "element-at") {
          return;
        }

        const done = waiter.current.waiting.get(message.requestId);

        if (!done) {
          return;
        }

        waiter.current.waiting.delete(message.requestId);
        done({ inside: message.inside, selection: message.selection });
      }),
    [listen]
  );

  return useCallback(
    (point: Point): Promise<Drop> => {
      const { promise, resolve } = Promise.withResolvers<Drop>();
      waiter.current.nextId += 1;
      const id = `vector-${waiter.current.nextId}`;
      waiter.current.waiting.set(id, resolve);

      globalThis.setTimeout(() => {
        if (waiter.current.waiting.delete(id)) {
          resolve({ inside: false, selection: null });
        }
      }, DROP_WAIT_MS);
      post({ requestId: id, type: "element-at", x: point.x, y: point.y });

      return promise;
    },
    [post]
  );
};

export { useDropAt };
