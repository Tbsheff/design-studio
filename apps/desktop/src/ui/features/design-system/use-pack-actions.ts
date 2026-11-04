import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { packApi } from "../../platform/pack-api.js";
import type { DesignSystemActions } from "./design-system-model.js";
import { refreshPacks } from "./packs.js";

const TOAST_MS = 5000;

export interface Toast {
  id: number;
  text: string;
}

interface Options {
  projectId: string;
  directionId: string | null;
  setProject: (project: Project) => void;
  onCommitted: () => void;
}

export const usePackActions = ({
  projectId,
  directionId,
  setProject,
  onCommitted,
}: Options): { actions: DesignSystemActions; toast: Toast | null } => {
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
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      TOAST_MS
    );

    return () => clearTimeout(timer);
  }, [toast]);

  const actions = useMemo<DesignSystemActions>(
    () => ({
      onApply: async (packId) => {
        if (!directionId) {
          return;
        }

        const result = await packApi.applyPack(projectId, directionId, packId);
        setProject(result.project);
        onCommitted();
        show(result.notice ?? `${result.version.title}.`);
      },
      onSave: async (name, packId, asNew, force) => {
        if (!directionId) {
          return;
        }

        const result = await packApi.savePack(projectId, directionId, {
          name,
          ...(packId ? { packId } : {}),
          ...(asNew ? { asNew: true } : {}),
          ...(force ? { force: true } : {}),
        });

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
