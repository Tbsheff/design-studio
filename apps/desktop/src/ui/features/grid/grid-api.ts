import { call, gridRoutes } from "./deps.js";
import type {
  GridInfo,
  GridSetResult,
  SelectionContext,
  SourceLoc,
} from "./deps.js";

interface GridIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface GridChange {
  readonly columns?: string | null;
  readonly display?: "grid";
  readonly rows?: string | null;
}

interface GridItemChange {
  readonly colSpan?: number | null;
  readonly colStart?: number | null;
  readonly rowSpan?: number | null;
  readonly rowStart?: number | null;
}

const NO_SOURCE = "This layer has no source location.";

const readGrid = (
  ids: GridIds,
  source: SourceLoc,
  breakpoint: string
): Promise<GridInfo> =>
  call(gridRoutes.getGrid, {
    breakpoint,
    col: source.col,
    directionId: ids.directionId,
    file: source.file,
    line: source.line,
    projectId: ids.projectId,
  });

const writeGrid = (
  ids: GridIds,
  target: SelectionContext,
  breakpoint: string,
  change: GridChange
): Promise<GridSetResult> => {
  const { selector, source, tag } = target;

  if (source === null) {
    return Promise.reject(new Error(NO_SOURCE));
  }

  return call(gridRoutes.setGrid, {
    ...change,
    breakpoint,
    directionId: ids.directionId,
    projectId: ids.projectId,
    target: { selector, source, tag },
  });
};

const writeGridItem = (
  ids: GridIds,
  target: SelectionContext,
  breakpoint: string,
  change: GridItemChange
): Promise<GridSetResult> => {
  const { selector, source, tag } = target;

  if (source === null) {
    return Promise.reject(new Error(NO_SOURCE));
  }

  return call(gridRoutes.setGridItemGrid, {
    ...change,
    breakpoint,
    directionId: ids.directionId,
    projectId: ids.projectId,
    target: { selector, source, tag },
  });
};

export { readGrid, writeGrid, writeGridItem };

export type { GridChange, GridIds, GridItemChange };
