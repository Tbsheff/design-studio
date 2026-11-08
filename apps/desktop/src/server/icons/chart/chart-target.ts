import type { Direction, Project } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";

import {
  describeElement,
  isLayerRef,
  memoPage,
  resolveLayerRef,
  scopeOf,
  toProbeTarget,
} from "../../page-probe/index.js";
import type { PreviewService } from "../../preview/index.js";
import { withPagePath } from "../../project-source/index.js";
import { ChartRequestError } from "./chart-request-error.js";

interface LayerRequest {
  readonly direction: Direction;
  readonly layerId: string;
  readonly preview: PreviewService;
  readonly project: Project;
}

const SOURCE_LOCATION = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const VIEWPORT = { height: 900, width: 1440 } as const;

const toSourceTarget = (layerId: string): InsertTarget | null => {
  const groups = SOURCE_LOCATION.exec(layerId.trim())?.groups ?? null;

  if (groups === null) {
    return null;
  }

  return {
    source: {
      col: Number(groups["col"]),
      file: groups["file"] ?? "",
      line: Number(groups["line"]),
    },
  };
};

const toLayerTarget = async (request: LayerRequest): Promise<InsertTarget> => {
  const { direction, preview, project } = request;
  const ref = request.layerId.trim();
  const scope = scopeOf(project.id, direction.id);
  const base = await preview.directionUrl(project, direction);
  const url = withPagePath(base, memoPage(scope, ref) ?? "");

  const found = await resolveLayerRef(
    toProbeTarget(preview, url, VIEWPORT, scope),
    ref
  );

  const element = await describeElement(preview, url, found);

  if (element === null) {
    throw new ChartRequestError(
      `The layer ${ref} is not on the page. Call get_layers again for fresh ids.`
    );
  }

  return {
    owners: element.owners ?? [],
    selector: found,
    source: element.source,
    tag: element.tag,
  };
};

const toChartTarget = (request: LayerRequest): Promise<InsertTarget> => {
  const located = toSourceTarget(request.layerId);

  if (located !== null) {
    return Promise.resolve(located);
  }

  if (isLayerRef(request.layerId.trim())) {
    return toLayerTarget(request);
  }

  return Promise.reject(
    new ChartRequestError(
      `The layer ${request.layerId} is not a layer id from get_layers or a file:line:col source location.`
    )
  );
};

export { toChartTarget };

export type { LayerRequest };
