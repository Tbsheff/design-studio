import { useMemo } from "react";
import type { ReactElement } from "react";

import type { CanvasFrame, CanvasLayout } from "./canvas-frames-model.js";
import type { CanvasStageProps } from "./canvas-stage-types.js";
import {
  isGridVisible,
  isRowsVisible,
  toGridColumns,
  toGridKey,
  toGridStyle,
  toPopoverStyle,
} from "./layout-grid-model.js";
import { LayoutGridPopover } from "./layout-grid-popover.js";
import {
  useLayoutGridKey,
  useLayoutGridPopover,
  useLayoutGridShown,
} from "./use-layout-grid.js";

interface LayoutGridOverlayProps {
  readonly props: CanvasStageProps["props"];
  readonly stage: CanvasStageProps["stage"];
}

interface GridFrame {
  readonly frame: CanvasFrame;
  readonly hasRows: boolean;
}

const toGridFrames = (
  layout: CanvasLayout,
  zoom: number
): readonly GridFrame[] =>
  layout.frames.flatMap((frame) => {
    const grid = frame.layoutGrid ?? null;

    if (frame.hidden || grid === null) {
      return [];
    }

    if (!isGridVisible(grid, frame.width, zoom)) {
      return [];
    }

    return [{ frame, hasRows: isRowsVisible(grid, zoom) }];
  });

const toGridClass = (hasRows: boolean): string => {
  if (hasRows) {
    return "layout-grid has-rows";
  }

  return "layout-grid";
};

const LayoutGridOverlay = ({
  props,
  stage,
}: LayoutGridOverlayProps): ReactElement => {
  const { layout } = stage.canvasFrames;
  const origin = stage.active;
  const { zoom } = stage.pz;
  const isShown = useLayoutGridShown();

  const { close, frameId, isPending, setGrid } = useLayoutGridPopover(
    props.projectId
  );

  useLayoutGridKey(props.selection.length);

  const frames = useMemo(() => {
    if (!isShown) {
      return [];
    }

    return toGridFrames(layout, zoom);
  }, [isShown, layout, zoom]);

  const open = layout.frames.find((frame) => frame.id === frameId) ?? null;

  return (
    <div className="layout-grid-layer" data-testid="layout-grid">
      {frames.map(({ frame, hasRows }) => (
        <div
          key={frame.id}
          className={toGridClass(hasRows)}
          style={toGridStyle(frame, origin, frame.layoutGrid?.rowStep ?? null)}
        >
          {frame.layoutGrid &&
            toGridColumns(frame.layoutGrid, frame.width).map((column) => (
              <div
                key={column.left}
                className="layout-grid-column"
                style={column.style}
              />
            ))}
        </div>
      ))}
      {open && (
        <LayoutGridPopover
          key={toGridKey(open)}
          frameWidth={open.width}
          grid={open.layoutGrid ?? null}
          isPending={isPending}
          onClose={close}
          onSet={setGrid}
          place={toPopoverStyle(open, origin, zoom)}
        />
      )}
    </div>
  );
};

export { LayoutGridOverlay };
