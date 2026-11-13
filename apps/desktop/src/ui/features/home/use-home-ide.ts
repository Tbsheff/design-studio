import type { PackSummary, Project } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";

import { openPrototypeDialog } from "./deps.js";
import { toHomeCommands } from "./home-command-model.js";
import type {
  HomeCommand,
  HomeCommandsInput,
  HomeLayer,
} from "./home-command-model.js";
import { homePrefs } from "./home-prefs-model.js";
import { useActivity } from "./use-activity.js";
import type { ActivityState } from "./use-activity.js";
import { useEditAppConfirm } from "./use-edit-app-confirm.js";
import type { EditAppConfirm } from "./use-edit-app-confirm.js";
import { setComposerFocus, useHomeKeys } from "./use-home-keys.js";
import type { WorkspaceNav } from "./use-workspace-nav.js";
import type { WorkspaceTarget } from "./use-workspace-target.js";
import { toDefaultLine } from "./workspace-model.js";
import type { StarterId } from "./workspace-model.js";

type CommandSource = () => readonly HomeCommand[];

interface HomeIdeInput {
  readonly onAttach: () => void;
  readonly onCommands: (source: CommandSource | null) => void;
  readonly onLayer: (layer: HomeLayer) => void;
  readonly onOpen: (projectId: string) => void;
  readonly onSample: () => void;
  readonly onTrashOpen: (isOpen: boolean) => void;
  readonly packs: readonly PackSummary[] | null;
  readonly projects: readonly Project[] | null;
  readonly target: WorkspaceTarget;
}

interface HomeIde {
  readonly activity: ActivityState;
  readonly defaultLine: string | null;
  readonly editConfirm: EditAppConfirm;
  readonly isEditApp: boolean;
  readonly nav: WorkspaceNav;
  readonly onAttach: () => void;
  readonly onSearch: () => void;
  readonly onStarter: (id: StarterId) => void;
  readonly onTrash: () => void;
  readonly packName: string | null;
}

const toPackName = (
  packs: readonly PackSummary[] | null,
  packId: string | null
): string | null => packs?.find((pack) => pack.id === packId)?.name ?? null;

const setTemplatesShown = (): void => {
  homePrefs.set({ hasTemplatesShown: true });
  setComposerFocus();
};

const useStarter = (
  input: HomeIdeInput,
  nav: WorkspaceNav,
  editConfirm: EditAppConfirm
): ((id: StarterId) => void) => {
  const { onSample } = input;
  const { setIsEditApp } = input.target;
  const anchorId = nav.selected?.anchor?.id ?? null;
  const { onRequest } = editConfirm;

  return useCallback(
    (id: StarterId): void => {
      if (id === "edit") {
        onRequest();
      } else if (id === "prototype" && anchorId !== null) {
        setIsEditApp(false);
        openPrototypeDialog(anchorId);
      } else if (id === "sample") {
        onSample();
      } else if (id === "template") {
        setTemplatesShown();
      } else {
        setComposerFocus();
      }
    },
    [anchorId, onRequest, onSample, setIsEditApp]
  );
};

const useCommandSource = (input: HomeIdeInput, nav: WorkspaceNav): void => {
  const { onAttach, onCommands, onLayer, onSample, onTrashOpen } = input;
  const { onSelect, selected, workspaces } = nav;
  const { projects } = input;
  const onComposer = setComposerFocus;

  const onTrash = useCallback((): void => {
    onTrashOpen(true);
  }, [onTrashOpen]);

  const latest = useRef<HomeCommandsInput>({
    onAttach,
    onComposer,
    onLayer,
    onSample,
    onSelect,
    onTrash,
    projects,
    selected,
    workspaces,
  });

  useEffect(() => {
    latest.current = {
      onAttach,
      onComposer,
      onLayer,
      onSample,
      onSelect,
      onTrash,
      projects,
      selected,
      workspaces,
    };
  });

  useEffect(() => {
    onCommands(() => toHomeCommands(latest.current));

    return (): void => {
      onCommands(null);
    };
  }, [onCommands]);
};

const useHomeIde = (input: HomeIdeInput): HomeIde => {
  const { onAttach, onLayer, onTrashOpen } = input;
  const { isEditApp, nav, setIsEditApp } = input.target;
  const { onSelect, selected, workspaces } = nav;
  const count = workspaces.length;
  const activity = useActivity();
  const editConfirm = useEditAppConfirm(selected?.folder ?? null, setIsEditApp);
  const onStarter = useStarter(input, nav, editConfirm);

  const packName = toPackName(
    input.packs,
    selected?.anchor?.packId ?? selected?.app?.packId ?? null
  );

  const defaultLine = toDefaultLine(selected, isEditApp);

  useCommandSource(input, nav);
  useHomeKeys({ count, onLayer, onSelect });

  const onTrash = useCallback((): void => {
    onTrashOpen(true);
  }, [onTrashOpen]);

  const onSearch = useCallback((): void => {
    onLayer("palette");
  }, [onLayer]);

  return {
    activity,
    defaultLine,
    editConfirm,
    isEditApp,
    nav,
    onAttach,
    onSearch,
    onStarter,
    onTrash,
    packName,
  };
};

export { useHomeIde };

export type { CommandSource, HomeIde, HomeIdeInput };
