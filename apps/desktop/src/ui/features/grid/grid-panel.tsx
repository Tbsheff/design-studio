import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { GridItemFields } from "./grid-item-fields.js";
import { GridLayerFields } from "./grid-layer-fields.js";
import {
  canBecomeGrid,
  isGridItem,
  isGridLayer,
  toBreakpoint,
} from "./grid-model.js";
import { GridNote } from "./grid-note.js";
import { useGridHandlers } from "./use-grid-handlers.js";
import { useGrid } from "./use-grid.js";

import styles from "./grid.module.css";

interface GridPanelProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
  readonly variant: string;
}

const GridPanel = ({
  directionId,
  projectId,
  target,
  variant,
}: GridPanelProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const grid = useGrid(ids, target, toBreakpoint(variant));
  const handlers = useGridHandlers(grid);
  const { info } = grid;
  const isLayer = isGridLayer(target);
  const isOff = info === null || info.mode === "none" || grid.isPending;

  return (
    <div className={styles.body}>
      {isLayer && info !== null && (
        <GridLayerFields
          columns={target.styles["grid-template-columns"] ?? ""}
          disabled={isOff}
          info={info}
          rows={target.styles["grid-template-rows"] ?? ""}
          onCommit={handlers.handleTracks}
        />
      )}
      {!isLayer && canBecomeGrid(target) && (
        <button
          className={styles.make}
          data-tip={copy.makeGridTip}
          disabled={isOff}
          type="button"
          onClick={handlers.handleMake}
        >
          {copy.makeGrid}
        </button>
      )}
      {isGridItem(target) && info !== null && (
        <GridItemFields
          disabled={isOff}
          info={info}
          onCommit={handlers.handleLine}
        />
      )}
      {info !== null && info.mode === "none" && (
        <GridNote isError={false} text={info.reason} />
      )}
      <GridNote isError text={grid.error} />
    </div>
  );
};

export { GridPanel };

export type { GridPanelProps };
