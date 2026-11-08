import type { Direction, Project } from "@design-studio/contracts";
import type { ExportFrame } from "@design-studio/contracts/export";

import {
  EditError,
  isLayerRef,
  LayerRefError,
  resolveLayerRef,
  scopeOf,
  toProbeTarget,
} from "../page-probe/index.js";
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
      toProbeTarget(
        runtime.preview,
        url,
        { height: frame.height, width: frame.width },
        scopeOf(project.id, direction.id)
      ),
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
