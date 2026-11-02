import { json } from "./deps.js";
import type {
  SelectionContext,
  SourceLoc,
  StackingInfo,
  StackingSetResult,
} from "./deps.js";
import type { StackingEdit } from "./stacking-model.js";

interface StackingIds {
  readonly directionId: string;
  readonly projectId: string;
}

const pathOf = (ids: StackingIds): string =>
  `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/stacking`;

const readStacking = (
  ids: StackingIds,
  source: SourceLoc,
  breakpoint: string
): Promise<StackingInfo> => {
  const query = new URLSearchParams({
    breakpoint,
    col: String(source.col),
    file: source.file,
    line: String(source.line),
  });

  return json<StackingInfo>("GET", `${pathOf(ids)}?${query.toString()}`);
};

const writeStacking = (
  ids: StackingIds,
  target: SelectionContext,
  breakpoint: string,
  edit: StackingEdit
): Promise<StackingSetResult> =>
  json<StackingSetResult>("POST", pathOf(ids), {
    ...edit,
    breakpoint,
    target: {
      selector: target.selector,
      source: target.source,
      tag: target.tag,
    },
  });

export { readStacking, writeStacking };

export type { StackingIds };
