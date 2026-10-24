import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project } from '../shared/contracts';
import { api } from './api';
import type { DesignSystemActions } from './components/DesignSystemChip';
import { refreshPacks } from './packs';

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

export function usePackActions({ projectId, directionId, setProject, onCommitted }: Options): { actions: DesignSystemActions; toast: Toast | null } {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const actions = useMemo<DesignSystemActions>(
    () => ({
      onApply: async (packId) => {
        if (!directionId) return;
        const result = await api.applyPack(projectId, directionId, packId);
        setProject(result.project);
        onCommitted();
        show(result.notice ?? `${result.version.title}.`);
      },
      onSave: async (name) => {
        if (!directionId) return;
        const result = await api.savePack(projectId, directionId, { name });
        refreshPacks();
        show(`Saved ${result.pack.name} to your library.`);
      },
    }),
    [projectId, directionId, setProject, onCommitted, show],
  );

  return { actions, toast };
}
