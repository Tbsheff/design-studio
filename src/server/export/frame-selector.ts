import type { Direction, Project } from "../../shared/contracts.js";
import type { ExportFrame } from "../../shared/export.js";
import { EditError } from "../page-probe/edit-error.js";
import {
  isLayerRef,
  LayerRefError,
  resolveLayerRef,
  scopeOf,
} from "../page-probe/layer-ref.js";
import type { ExportRuntime } from "./export-core.js";
import { withPagePath } from "./source.js";

interface SelectorQuery {
  readonly direction: Direction;
  readonly frame: ExportFrame | null;
  readonly project: Project;
  readonly raw: string | null;
}

const resolveFrameSelector = async (
  runtime: ExportRuntime,
  query: SelectorQuery
): Promise<string | null> => {
  const { direction, frame, project, raw } = query;

  if (raw === null || frame === null || !isLayerRef(raw)) {
    return raw;
  }

  const url = withPagePath(
    await runtime.preview.directionUrl(project, direction),
    frame.path
  );

  try {
    return await resolveLayerRef(
      runtime.preview,
      url,
      { height: frame.height, width: frame.width },
      scopeOf(project.id, direction.id),
      raw.trim()
    );
  } catch (error) {
    if (error instanceof LayerRefError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

export { resolveFrameSelector };
