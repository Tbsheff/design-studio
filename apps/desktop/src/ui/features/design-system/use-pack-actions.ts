import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { packApi } from "../../platform/pack-api.js";
import type { DesignSystemActions } from "./design-system-model.js";
import { refreshPacks } from "./packs.js";

const TOAST_MS = 5000;

interface Toast {
  id: number;
  text: string;
}

interface PackActionsResult {
  actions: DesignSystemActions;
  toast: Toast | null;
}

type SaveBody = Parameters<typeof packApi.savePack>[2];

interface SaveBodyDraft {
  asNew?: boolean;
  force?: boolean;
  name: string;
  packId?: string;
}

interface SaveOptions {
  asNew?: boolean;
  force?: boolean;
  packId?: string;
}

const toRemainingToast = (current: Toast | null, id: number): Toast | null => {
  if (current?.id === id) {
    return null;
  }

  return current;
};

const toSaveBody = (name: string, options: SaveOptions): SaveBody => {
  const body: SaveBodyDraft = { name };

  if (options.packId) {
    body.packId = options.packId;
  }

  if (options.asNew) {
    body.asNew = true;
  }

  if (options.force) {
    body.force = true;
  }

  return body;
};

interface Options {
  projectId: string;
  directionId: string | null;
  setProject: (project: Project) => void;
  onCommitted: () => void;
}

const usePackActions = ({
  projectId,
  directionId,
  setProject,
  onCommitted,
}: Options): PackActionsResult => {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback(
    (text: string) => setToast({ id: Date.now(), text }),
    []
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(
      () => setToast((current) => toRemainingToast(current, toast.id)),
      TOAST_MS
    );

    return (): void => clearTimeout(timer);
  }, [toast]);

  const actions = useMemo<DesignSystemActions>(
    () => ({
      onApply: async (packId): Promise<void> => {
        if (!directionId) {
          return;
        }

        const result = await packApi.applyPack(projectId, directionId, packId);
        setProject(result.project);
        onCommitted();
        show(result.notice ?? `${result.version.title}.`);
      },
      onSave: async (name, packId, asNew, force): Promise<void> => {
        if (!directionId) {
          return;
        }

        const result = await packApi.savePack(
          projectId,
          directionId,
          toSaveBody(name, { asNew, force, packId })
        );

        refreshPacks();
        setProject(result.project);

        if (result.version) {
          onCommitted();
        }

        show(`Saved ${result.pack.name} to your library.`);
      },
    }),
    [projectId, directionId, setProject, onCommitted, show]
  );

  return { actions, toast };
};

export { usePackActions };

export type { Toast };
