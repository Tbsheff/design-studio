import { useCallback, useTransition } from "react";

import { toNewDraft } from "./animation-model.js";
import type { Draft } from "./animation-model.js";
import { animationRoutes, useAction } from "./deps.js";
import type { RouteOutput } from "./deps.js";

type ExportFormat = "css" | "react" | "webm";

type ExportResult = RouteOutput<typeof animationRoutes.exportAnimation>;

interface Target {
  readonly directionId: string;
  readonly projectId: string;
}

interface ActionOptions {
  readonly edited: Draft | null;
  readonly onCreated: (id: string) => void;
  readonly onDeleted: () => void;
  readonly onExported: (result: ExportResult | null) => void;
  readonly onSaved: () => void;
  readonly selectedId: string | null;
  readonly selector: string | null;
  readonly target: Target;
}

interface ActionState {
  readonly error: string | null;
  readonly isBusy: boolean;
  readonly onCreate: () => void;
  readonly onDelete: () => void;
  readonly onExport: (format: ExportFormat) => void;
  readonly onSave: () => void;
}

const FALLBACK_SELECTOR = "body";

const useAnimationActions = (options: ActionOptions): ActionState => {
  const { edited, selectedId, selector, target } = options;
  const [isBusy, startBusy] = useTransition();
  const creator = useAction(animationRoutes.createAnimation);
  const updater = useAction(animationRoutes.updateAnimation);
  const remover = useAction(animationRoutes.deleteAnimation);
  const exporter = useAction(animationRoutes.exportAnimation);

  const onCreate = useCallback((): void => {
    startBusy(async () => {
      const base = toNewDraft(selector ?? FALLBACK_SELECTOR);
      const done = await creator.run({ ...base, ...target, file: null });

      if (done !== null) {
        options.onCreated(done.animation.id);
      }
    });
  }, [creator, options, selector, target]);

  const onSave = useCallback((): void => {
    if (edited === null || selectedId === null) {
      return;
    }

    startBusy(async () => {
      const input = { ...edited, ...target, animationId: selectedId };

      if ((await updater.run(input)) !== null) {
        options.onSaved();
      }
    });
  }, [edited, options, selectedId, target, updater]);

  const onDelete = useCallback((): void => {
    if (selectedId === null) {
      return;
    }

    startBusy(async () => {
      const done = await remover.run({ ...target, animationId: selectedId });

      if (done !== null) {
        options.onDeleted();
      }
    });
  }, [options, remover, selectedId, target]);

  const onExport = useCallback(
    (format: ExportFormat): void => {
      if (selectedId === null) {
        return;
      }

      startBusy(async () => {
        const input = { ...target, animationId: selectedId, format };

        options.onExported(await exporter.run(input));
      });
    },
    [exporter, options, selectedId, target]
  );

  const failure = creator.error ?? updater.error ?? remover.error;

  return {
    error: (failure ?? exporter.error)?.message ?? null,
    isBusy,
    onCreate,
    onDelete,
    onExport,
    onSave,
  };
};

export { useAnimationActions };

export type { ActionState, ExportFormat, ExportResult, Target };
