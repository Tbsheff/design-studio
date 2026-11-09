import { useMemo, useTransition } from "react";

import {
  api,
  errorText,
  isDesktop,
  openProject,
  projectsApi,
  uiStore,
  useProjectHits,
  useRouteHits,
} from "./deps.js";
import type { ProjectHit } from "./deps.js";
import { globalCommands } from "./global-commands.js";
import { IS_MAC } from "./keys.js";
import { readRecent } from "./palette-model.js";
import type { Row, RowActions } from "./palette-row-types.js";
import { buildRows } from "./palette-rows.js";
import { collectCommands } from "./registry.js";
import type { Command } from "./registry.js";
import { useFileRows } from "./use-file-rows.js";
import type { OpenTarget } from "./use-file-rows.js";

interface PaletteRows {
  isBusy: boolean;
  isLoading: boolean;
  rows: Row[];
}

const mac = IS_MAC;

const NO_PROJECTS: ProjectHit[] = [];

const desktop = "window" in globalThis && isDesktop();

const toUniqueCommands = (onShortcuts: () => void): Command[] => {
  const all = [...collectCommands(), ...globalCommands(onShortcuts)].filter(
    (command) => !command.id.startsWith("project.open.")
  );

  return all.filter(
    (command, index) =>
      all.findIndex((other) => other.id === command.id) === index
  );
};

interface PaletteRowsInput {
  readonly isFiles: boolean;
  readonly isProjectsOnly: boolean;
  readonly onClose: () => void;
  readonly onOpenFile: (target: OpenTarget) => void;
  readonly onShortcuts: () => void;
  readonly query: string;
  readonly setError: (error: string | null) => void;
}

const toShownRows = (rows: Row[], isProjectsOnly: boolean): Row[] => {
  if (!isProjectsOnly) {
    return rows;
  }

  return rows.filter((row) => row.kind === "project");
};

const usePaletteRows = (input: PaletteRowsInput): PaletteRows => {
  const { isFiles, isProjectsOnly, onClose, onOpenFile } = input;
  const { onShortcuts, query, setError } = input;
  const current = uiStore.get().activeProjectId;
  const hits = useProjectHits(current, true);
  const routes = useRouteHits(query, current, hits?.routes ?? []);
  const recent = useMemo(() => readRecent(), []);
  const commands = useMemo(() => toUniqueCommands(onShortcuts), [onShortcuts]);
  const [isBusy, startTransition] = useTransition();

  const actions = useMemo<RowActions>(
    () => ({
      newPrototype: (prompt: string): void => {
        setError(null);
        startTransition(async () => {
          try {
            const { project } = await api.createProject({
              kind: "html",
              prompt,
            });

            projectsApi.load();
            onClose();
            openProject(project.id);
          } catch (error: unknown) {
            setError(errorText(error));
          }
        });
      },
      openProject: (id: string, route?: string): void => {
        onClose();
        globalThis.setTimeout(() => openProject(id, route), 0);
      },
    }),
    [onClose, setError]
  );

  const projects = hits?.projects ?? NO_PROJECTS;

  const rows = useMemo(
    () =>
      buildRows({
        actions,
        commands,
        current,
        desktop,
        mac,
        projects,
        query,
        recent,
        routes,
      }),
    [actions, commands, current, projects, query, recent, routes]
  );

  const shown = useMemo(
    () => toShownRows(rows, isProjectsOnly),
    [isProjectsOnly, rows]
  );

  const files = useFileRows(isFiles, query, onOpenFile);

  if (isFiles) {
    return { isBusy: false, isLoading: files.isLoading, rows: files.rows };
  }

  const isLoading = hits === null;

  return { isBusy, isLoading, rows: shown };
};

export { usePaletteRows };

export type { PaletteRows };
