import { useCallback, useMemo, useState } from "react";

import type { Draft } from "./animation-model.js";
import { animationRoutes, useAction } from "./deps.js";
import type { RouteOutput } from "./deps.js";
import { useAnimationActions } from "./use-animation-actions.js";
import type { ActionState, ExportResult } from "./use-animation-actions.js";

interface AnimationOptions {
  readonly directionId: string;
  readonly projectId: string;
  readonly selector: string | null;
}

type Row = RouteOutput<typeof animationRoutes.listAnimation>["items"][number];

interface AnimationState extends ActionState {
  readonly draft: Draft | null;
  readonly exported: ExportResult | null;
  readonly isDirty: boolean;
  readonly onPick: (id: string) => void;
  readonly rows: readonly Row[];
  readonly selectedId: string | null;
  readonly setDraft: (draft: Draft) => void;
}

const useAnimation = (options: AnimationOptions): AnimationState => {
  const { directionId, projectId, selector } = options;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edited, setEdited] = useState<Draft | null>(null);
  const [exported, setExported] = useState<ExportResult | null>(null);

  const target = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const listInput = useMemo(
    () => ({ ...target, cursor: null, limit: 50 }),
    [target]
  );

  const getInput = useMemo(() => {
    if (selectedId === null) {
      return null;
    }

    return { ...target, animationId: selectedId };
  }, [selectedId, target]);

  const lister = useAction(animationRoutes.listAnimation, listInput);
  const getter = useAction(animationRoutes.getAnimation, getInput);

  const onPick = useCallback((id: string): void => {
    setSelectedId(id);
    setEdited(null);
    setExported(null);
  }, []);

  const onDeleted = useCallback((): void => {
    setSelectedId(null);
    setEdited(null);
  }, []);

  const onSaved = useCallback((): void => setEdited(null), []);

  const onCreated = onPick;
  const onExported = setExported;

  const actions = useAnimationActions({
    edited,
    onCreated,
    onDeleted,
    onExported,
    onSaved,
    selectedId,
    selector,
    target,
  });

  return {
    ...actions,
    draft: edited ?? getter.data?.animation ?? null,
    exported,
    isDirty: edited !== null,
    onPick,
    rows: lister.data?.items ?? [],
    selectedId,
    setDraft: setEdited,
  };
};

export { useAnimation };

export type { AnimationOptions, AnimationState };
