import { useCallback, useTransition } from "react";

import { copy } from "./copy.js";
import { layerStyleRoutes, useAction } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import {
  copiedStyleStore,
  toLayerId,
  toPasteBody,
  toPasteSummary,
} from "./layer-style-model.js";
import type { StyleGroup } from "./layer-style-model.js";

interface LayerStyleApplyOptions {
  readonly close: () => void;
  readonly directionId: string | null;
  readonly notify: (message: string) => void;
  readonly projectId: string;
  readonly selection: SelectionContext[];
  readonly variant: string;
}

interface LayerStyleApply {
  readonly apply: (groups: readonly StyleGroup[] | null) => void;
  readonly isPending: boolean;
}

const useLayerStyleApply = (
  options: LayerStyleApplyOptions
): LayerStyleApply => {
  const [isPending, startWork] = useTransition();
  const { run } = useAction(layerStyleRoutes.applyLayerStyle);
  const { close, directionId, notify, projectId, selection } = options;

  const apply = useCallback(
    (groups: readonly StyleGroup[] | null): void => {
      const current = copiedStyleStore.get();

      if (current === null || directionId === null) {
        return;
      }

      const body = {
        directionId,
        projectId,
        sourceLayerId: current.layerId,
        targetLayerIds: selection.flatMap((item) => toLayerId(item) ?? []),
        variant: options.variant,
      };

      startWork(async () => {
        const result = await run(toPasteBody(body, groups));

        close();

        if (result === null) {
          notify(copy.failed);

          return;
        }

        notify(toPasteSummary(result));
      });
    },
    [close, directionId, notify, options.variant, projectId, run, selection]
  );

  return { apply, isPending };
};

export { useLayerStyleApply };
