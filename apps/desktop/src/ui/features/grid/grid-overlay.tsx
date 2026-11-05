import { useCallback, useMemo, useReducer } from "react";
import type { ReactElement } from "react";

import type { GridInfo, SelectionContext } from "./deps.js";
import { GridAxisLayer } from "./grid-axis-layer.js";
import type { GridDragLive } from "./grid-drag-model.js";
import { toGeometry } from "./grid-geometry.js";
import type { GridGeometry } from "./grid-geometry.js";
import { isGridLayer, toBreakpoint, toTrackWords } from "./grid-model.js";
import type { GridAxis } from "./grid-model.js";
import { useGridDrag } from "./use-grid-drag.js";
import type { GridDragHost } from "./use-grid-drag.js";
import { useGridInfo } from "./use-grid-info.js";

import styles from "./grid.module.css";

interface GridHost extends GridDragHost {
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly projectId: string;
}

interface GridOverlayProps {
  readonly host: GridHost;
  readonly selection: readonly SelectionContext[];
  readonly variant: string;
  readonly zoom: number;
}

interface AxisView {
  readonly px: readonly number[];
  readonly words: readonly string[];
}

const HANDLE_PX = 10;

const sumOf = (px: readonly number[], gap: number): number =>
  px.reduce((total, size) => total + size, 0) +
  gap * Math.max(0, px.length - 1);

const toTarget = (
  host: GridHost,
  selection: readonly SelectionContext[]
): SelectionContext | null => {
  const [only] = selection;

  if (!host.enabled || selection.length !== 1 || !only?.source) {
    return null;
  }

  if (!isGridLayer(only) || host.directionId === null) {
    return null;
  }

  return only;
};

const toAxisView = (
  info: GridInfo | null,
  base: readonly number[],
  axis: GridAxis,
  live: GridDragLive | null
): AxisView => {
  if (live !== null && live.axis === axis) {
    return { px: live.px, words: live.words };
  }

  if (info === null) {
    return { px: base, words: base.map((size) => `${Math.round(size)}px`) };
  }

  return { px: base, words: toTrackWords(info, axis, base) };
};

const toActive = (live: GridDragLive | null, axis: GridAxis): number | null => {
  if (live !== null && live.axis === axis) {
    return live.index;
  }

  return null;
};

const toGeometryOf = (target: SelectionContext | null): GridGeometry | null => {
  if (target === null) {
    return null;
  }

  return toGeometry(target);
};

const GridOverlay = ({
  host,
  selection,
  variant,
  zoom,
}: GridOverlayProps): ReactElement | null => {
  const target = toTarget(host, selection);
  const breakpoint = toBreakpoint(variant);
  const [round, bump] = useReducer((value: number) => value + 1, 0);
  const onSaved = useCallback(() => bump(), []);

  const ids = useMemo(
    () => ({ directionId: host.directionId ?? "", projectId: host.projectId }),
    [host.directionId, host.projectId]
  );

  const load = useGridInfo(ids, target?.source ?? null, breakpoint, round);
  const drag = useGridDrag({ breakpoint, host, ids, onSaved, target, zoom });
  const geometry = useMemo(() => toGeometryOf(target), [target]);

  if (target === null || geometry === null) {
    return null;
  }

  const columns = toAxisView(load.info, geometry.columns, "columns", drag.live);
  const rows = toAxisView(load.info, geometry.rows, "rows", drag.live);
  const width = sumOf(columns.px, geometry.columnGap) || geometry.innerWidth;
  const height = sumOf(rows.px, geometry.rowGap) || geometry.innerHeight;

  return (
    <div className={styles.layer} data-testid="grid-overlay">
      {drag.live !== null && (
        <div
          className={styles.shield}
          data-testid="grid-shield"
          onPointerMove={drag.handleMove}
          onPointerUp={drag.handleUp}
        />
      )}
      <GridAxisLayer
        activeIndex={toActive(drag.live, "columns")}
        axis="columns"
        crossSize={height}
        gap={geometry.columnGap}
        px={columns.px}
        thickness={HANDLE_PX / zoom}
        words={columns.words}
        left={geometry.left}
        top={geometry.top}
        onDown={drag.handleDown}
        onMove={drag.handleMove}
        onUp={drag.handleUp}
      />
      <GridAxisLayer
        activeIndex={toActive(drag.live, "rows")}
        axis="rows"
        crossSize={width}
        gap={geometry.rowGap}
        px={rows.px}
        thickness={HANDLE_PX / zoom}
        words={rows.words}
        left={geometry.left}
        top={geometry.top}
        onDown={drag.handleDown}
        onMove={drag.handleMove}
        onUp={drag.handleUp}
      />
    </div>
  );
};

export { GridOverlay };

export type { GridHost, GridOverlayProps };
