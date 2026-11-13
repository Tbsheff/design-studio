import type { Project } from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { homePrefs } from "./home-prefs-model.js";
import type { AppChipState } from "./use-app-chip.js";
import { PROTOTYPES_ID, toIndexFor, toWorkspaces } from "./workspace-model.js";
import type { Workspace } from "./workspace-model.js";

interface WorkspaceNav {
  readonly isOpen: (id: string) => boolean;
  readonly onSelect: (index: number) => void;
  readonly onToggleGroup: (key: string) => void;
  readonly onToggleWorkspace: (id: string) => void;
  readonly openGroups: ReadonlySet<string>;
  readonly selected: Workspace | null;
  readonly selectedIndex: number;
  readonly workspaces: readonly Workspace[];
}

type Expanded = ReadonlyMap<string, boolean>;

const toToggled = (
  current: ReadonlySet<string>,
  key: string
): ReadonlySet<string> => {
  const next = new Set(current);

  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  return next;
};

const toExpanded = (current: Expanded, id: string, isOpen: boolean): Expanded =>
  new Map([...current, [id, isOpen]]);

const applyChip = (app: AppChipState, workspace: Workspace): void => {
  if (workspace.folder === null) {
    app.clear();

    return;
  }

  if (app.chip?.path !== workspace.folder) {
    app.set(workspace.folder);
  }
};

const useChipBinding = (
  app: AppChipState,
  selected: Workspace | null,
  isLoaded: boolean
): void => {
  const bound = useRef<string | null>(null);
  const appRef = useRef(app);

  useEffect(() => {
    appRef.current = app;
  }, [app]);

  useEffect(() => {
    if (!isLoaded || selected === null || bound.current === selected.id) {
      return;
    }

    const isFirst = bound.current === null;
    bound.current = selected.id;

    if (isFirst && appRef.current.chip !== null) {
      return;
    }

    applyChip(appRef.current, selected);
  }, [isLoaded, selected]);
};

const useWorkspaceNav = (
  projects: readonly Project[] | null,
  app: AppChipState
): WorkspaceNav => {
  const workspaces = useMemo(() => toWorkspaces(projects), [projects]);

  const [selectedId, setSelectedId] = useState<string>(
    () => homePrefs.get().lastWorkspaceId ?? PROTOTYPES_ID
  );

  const [expanded, setExpanded] = useState<Expanded>(new Map());
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set());
  const selectedIndex = toIndexFor(workspaces, selectedId);
  const selected = workspaces[selectedIndex] ?? null;
  const selectedKey = selected?.id ?? null;

  useChipBinding(app, selected, projects !== null);

  const isOpen = useCallback(
    (id: string): boolean => expanded.get(id) ?? id === selectedKey,
    [expanded, selectedKey]
  );

  const onSelect = useCallback(
    (index: number): void => {
      const target = workspaces[index];

      if (target) {
        setSelectedId(target.id);
        homePrefs.set({ lastWorkspaceId: target.id });
        setExpanded(new Map([[target.id, true]]));
      }
    },
    [workspaces]
  );

  const onToggleWorkspace = useCallback(
    (id: string): void => {
      setExpanded((current) => toExpanded(current, id, !isOpen(id)));
    },
    [isOpen]
  );

  const onToggleGroup = useCallback((key: string): void => {
    setOpenGroups((current) => toToggled(current, key));
  }, []);

  return {
    isOpen,
    onSelect,
    onToggleGroup,
    onToggleWorkspace,
    openGroups,
    selected,
    selectedIndex,
    workspaces,
  };
};

export { useWorkspaceNav };

export type { WorkspaceNav };
