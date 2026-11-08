import type { LayerStyleSchema } from "@design-studio/actions/layer-style/schema";

import type { DirectionRun } from "./deps.js";
import {
  toGroupDeclarations,
  toOrderedGroups,
  toReadProperties,
  toStyleGroups,
} from "./engine/index.js";
import type { LayerStyleGroup } from "./engine/index.js";
import { LayerStyleError } from "./errors.js";
import { toResolvedLayers } from "./layer-style-resolve.js";
import { loadLayerSite } from "./layer-style-site.js";

type LayerStyleInfo = typeof LayerStyleSchema.Type;

interface GetRequest {
  readonly groups: readonly LayerStyleGroup[];
  readonly layerId: string;
}

const NO_SOURCE = "This layer has no source location in the project files.";

const inspectLayerStyle = async (
  run: DirectionRun,
  request: GetRequest
): Promise<LayerStyleInfo> => {
  const { direction, project, runtime } = run;
  const groups = toOrderedGroups(request.groups);

  const [layer] = await toResolvedLayers(
    { direction, project, runtime },
    [request.layerId],
    toReadProperties(groups)
  );

  if (!layer?.source) {
    throw new LayerStyleError(NO_SOURCE);
  }

  const site = await loadLayerSite(
    { project, workTree: direction.workTree },
    layer.source
  );

  if (site.isTailwind) {
    return {
      groups: toStyleGroups(site.classes, groups, site.theme).map((entry) => ({
        classes: entry.classes,
        declarations: [],
        group: entry.group,
      })),
      layerId: request.layerId,
      mode: "tailwind",
    };
  }

  return {
    groups: groups.map((group) => ({
      classes: [],
      declarations: toGroupDeclarations(layer.styles, group),
      group,
    })),
    layerId: request.layerId,
    mode: "css",
  };
};

export { inspectLayerStyle };

export type { GetRequest, LayerStyleInfo };
