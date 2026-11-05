import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { SelectionContext } from "./deps.js";
import type { GridIds } from "./grid-api.js";
import type { GridDragLive } from "./grid-drag-model.js";
import { toDragged } from "./grid-model.js";
import type { GridAxis } from "./grid-model.js";
import { useGridCommit } from "./use-grid-commit.js";

interface GridDragHost {
  readonly onError: (message: string) => void;
  readonly refreshRects: () => void;
  readonly setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
}

interface GridDragStart {
  readonly axis: GridAxis;
  readonly index: number;
  readonly px: readonly number[];
  readonly words: readonly string[];
}

interface Active extends GridDragStart {
  readonly start: number;
}

interface GridDragInput {
  readonly breakpoint: string;
  readonly host: GridDragHost;
  readonly ids: GridIds;
  readonly onSaved: () => void;
  readonly target: SelectionContext | null;
  readonly zoom: number;
}

interface GridDrag {
  readonly handleDown: (
    start: GridDragStart,
    event: ReactPointerEvent<HTMLElement>
  ) => void;
  readonly handleMove: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly handleUp: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly live: GridDragLive | null;
}

const toPosition = (
  axis: GridAxis,
  event: ReactPointerEvent<HTMLElement>
): number => {
  if (axis === "columns") {
    return event.clientX;
  }

  return event.clientY;
};

const useGridDrag = ({
  breakpoint,
  host,
  ids,
  onSaved,
  target,
  zoom,
}: GridDragInput): GridDrag => {
  const active = useRef<Active | null>(null);
  const [live, setLive] = useState<GridDragLive | null>(null);
  const commit = useGridCommit({ breakpoint, host, ids, onSaved });

  const handleDown = useCallback(
    (start: GridDragStart, event: ReactPointerEvent<HTMLElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      active.current = { ...start, start: toPosition(start.axis, event) };
      setLive({ ...start });
    },
    []
  );

  const handleMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const drag = active.current;

      if (drag === null) {
        return;
      }

      const delta = (toPosition(drag.axis, event) - drag.start) / zoom;
      const next = toDragged(drag.words, drag.px, drag.index, delta);

      setLive({ axis: drag.axis, index: drag.index, ...next });
    },
    [zoom]
  );

  const handleUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const drag = active.current;

      active.current = null;

      if (drag === null || live === null || target === null) {
        setLive(null);

        return;
      }

      const delta = (toPosition(drag.axis, event) - drag.start) / zoom;

      setLive(null);

      if (Math.abs(delta) < 1) {
        return;
      }

      commit(
        {
          axis: drag.axis,
          index: drag.index,
          ...toDragged(drag.words, drag.px, drag.index, delta),
        },
        target
      );
    },
    [commit, live, target, zoom]
  );

  return { handleDown, handleMove, handleUp, live };
};

export { useGridDrag };

export type { GridDrag, GridDragHost, GridDragStart };
