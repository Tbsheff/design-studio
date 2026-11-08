import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";

import type { DropHint, InsertHost } from "./component-insert-api.js";
import type { DropAt } from "./component-insert-hint.js";
import { localPoint } from "./component-insert-model.js";
import type { Options } from "./component-insert-model.js";
import type { InsertRun } from "./use-insert-run.js";

const MESSAGE_DROP = "Drop the component on an element in the frame.";

interface PendingHint {
  readonly id: string;
  readonly onHint: (hint: DropHint | null) => void;
}

interface InsertDrag {
  readonly drop: MutableRefObject<DropAt | null>;
  readonly pending: MutableRefObject<PendingHint | null>;
  readonly seq: MutableRefObject<number>;
}

const toDropPosition = (drop: DropAt): "after" | "inside" => {
  if (drop.inside) {
    return "inside";
  }

  return "after";
};

const useInsertDrag = (): InsertDrag => {
  const drop = useRef<DropAt | null>(null);
  const pending = useRef<PendingHint | null>(null);
  const seq = useRef(0);

  return { drop, pending, seq };
};

interface HostContext {
  readonly drag: InsertDrag;
  readonly live: MutableRefObject<Options>;
  readonly run: InsertRun;
}

const toInsertHost = (context: HostContext): InsertHost => {
  const { drag, live, run } = context;

  return {
    dragEnd(component, leftNext, topNext): void {
      const last = drag.drop.current;
      drag.drop.current = null;
      drag.pending.current = null;

      if (!localPoint(live.current.frames, leftNext, topNext)) {
        return;
      }

      if (!last?.selection) {
        live.current.notify(MESSAGE_DROP);

        return;
      }

      run(component, toDropPosition(last), last.selection);
    },
    dragMove(posXNext, posYNext, onHint): void {
      const point = localPoint(live.current.frames, posXNext, posYNext);

      if (!point) {
        drag.drop.current = null;
        onHint(null);

        return;
      }

      drag.seq.current += 1;
      const id = `drop-${drag.seq.current}`;
      drag.pending.current = { id, onHint };
      live.current.frames.post({
        requestId: id,
        type: "element-at",
        x: point.x,
        y: point.y,
      });
    },
    insert(component, position): void {
      run(component, position, live.current.selection.at(-1) ?? null);
    },
  };
};

const useInsertHost = (
  live: MutableRefObject<Options>,
  drag: InsertDrag,
  run: InsertRun
): InsertHost =>
  useMemo(() => toInsertHost({ drag, live, run }), [drag, live, run]);

export { useInsertDrag, useInsertHost };

export type { InsertDrag };
