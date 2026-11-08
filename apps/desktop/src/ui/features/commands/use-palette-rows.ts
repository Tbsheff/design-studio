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

const usePaletteRows = (
  query: string,
  onShortcuts: () => void,
  onClose: () => void,
  setError: (error: string | null) => void
): PaletteRows => {
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

  const isLoading = hits === null;

  return { isBusy, isLoading, rows };
};

export { usePaletteRows };

export type { PaletteRows };
