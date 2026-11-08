import type { MarkupLayerSchema } from "@design-studio/actions/markup/schema";

import type { DirectionRun } from "../../direct-edit/index.js";
import {
  layersAtPaths,
  scopeOf,
  toProbeTarget,
} from "../../page-probe/index.js";
import { withPagePath } from "../../project-source/index.js";
import { toBoxPathsExpression } from "./markup-probe.js";

type MarkupLayer = typeof MarkupLayerSchema.Type;

interface MarkupBox {
  readonly height: number;
  readonly label: string;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface MarkupLayersCommand {
  readonly boxes: readonly MarkupBox[];
  readonly framePath: string | null;
  readonly frameSize: { readonly height: number; readonly width: number };
}

const getMarkupLayers = async (
  run: DirectionRun,
  command: MarkupLayersCommand
): Promise<MarkupLayer[]> => {
  if (command.boxes.length === 0) {
    return [];
  }

  const scope = scopeOf(run.project.id, run.direction.id);

  const base = await run.runtime.preview.directionUrl(
    run.project,
    run.direction
  );

  let url = base;

  if (command.framePath !== null && command.framePath !== "") {
    url = withPagePath(base, command.framePath);
  }

  const found = await layersAtPaths(
    toProbeTarget(run.runtime.preview, url, command.frameSize, scope),
    [command.framePath].find((entry): entry is string => entry !== null),
    async (probe) => {
      const hits = await probe.evaluate<(string | null)[]>(
        toBoxPathsExpression(command.boxes)
      );

      const indexes = [...hits.keys()].filter((index) => hits[index] !== null);

      return {
        extra: indexes,
        paths: indexes.map((index) => hits[index] as string),
      };
    }
  );

  const out: MarkupLayer[] = [];

  for (const [order, layer] of found.layers.entries()) {
    const box = command.boxes[found.extra[order] as number] as MarkupBox;

    if (layer !== null) {
      out.push({
        component: layer.comp,
        id: layer.ref,
        label: box.label,
        source: (layer.comp && layer.used) || layer.own,
        tag: layer.tag,
        text: layer.text,
      });
    }
  }

  return out;
};

export { getMarkupLayers };

export type { MarkupBox, MarkupLayer, MarkupLayersCommand };
