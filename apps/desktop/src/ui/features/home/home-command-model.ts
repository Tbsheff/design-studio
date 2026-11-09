import type { Project } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import type { KeyId } from "../../../shared/keymap.js";
import { copy } from "./copy.js";
import { projectsApi } from "./projects-store-model.js";
import type { Workspace } from "./workspace-model.js";

type HomeLayer = "palette" | "projects";

interface HomeCommand {
  readonly group: string;
  readonly icon: IconName;
  readonly id: string;
  readonly keyId: KeyId | null;
  readonly keywords: string;
  readonly run: () => void;
  readonly title: string;
}

interface HomeCommandsInput {
  readonly onAttach: () => void;
  readonly onComposer: () => void;
  readonly onLayer: (layer: HomeLayer) => void;
  readonly onSample: () => void;
  readonly onSelect: (index: number) => void;
  readonly onTrash: () => void;
  readonly projects: readonly Project[] | null;
  readonly selected: Workspace | null;
  readonly workspaces: readonly Workspace[];
}

const GROUP = "Home";

const toWorkspaceCommands = (input: HomeCommandsInput): HomeCommand[] =>
  input.workspaces.map((workspace, index) => ({
    group: GROUP,
    icon: "folder",
    id: `home.workspace.${workspace.id}`,
    keyId: null,
    keywords: "workspace switch app folder",
    run: () => input.onSelect(index),
    title: `${copy.goToWorkspace} ${workspace.name}`,
  }));

const toPinTitle = (project: Project, isPinned: boolean): string => {
  if (isPinned) {
    return `${copy.unpinCommand} ${project.name}`;
  }

  return `${copy.pinCommand} ${project.name}`;
};

const toPinCommand = (project: Project): HomeCommand => {
  const isPinned = project.settings.isPinned === true;

  return {
    group: GROUP,
    icon: "magnet",
    id: `home.pin.${project.id}`,
    keyId: null,
    keywords: "pin unpin star sidebar favorite",
    run: () => {
      void projectsApi.pin(project, !isPinned);
    },
    title: toPinTitle(project, isPinned),
  };
};

const toNewTitle = (selected: Workspace | null): string =>
  `${copy.newDesignIn} ${selected?.name ?? copy.prototypesWorkspace}`;

const toHomeCommands = (input: HomeCommandsInput): HomeCommand[] => [
  {
    group: GROUP,
    icon: "plus",
    id: "home.new-design",
    keyId: "new-project",
    keywords: "create prompt composer",
    run: input.onComposer,
    title: toNewTitle(input.selected),
  },
  {
    group: GROUP,
    icon: "search",
    id: "home.open-project",
    keyId: null,
    keywords: "open switch find project",
    run: () => input.onLayer("projects"),
    title: copy.openProjectCommand,
  },
  {
    group: GROUP,
    icon: "folder",
    id: "home.attach-app",
    keyId: null,
    keywords: "add app folder attach code",
    run: input.onAttach,
    title: copy.attachAppFolder,
  },
  {
    group: GROUP,
    icon: "play",
    id: "home.open-sample",
    keyId: null,
    keywords: "sample demo example",
    run: input.onSample,
    title: copy.openTheSample,
  },
  {
    group: GROUP,
    icon: "trash",
    id: "home.trash",
    keyId: null,
    keywords: "deleted restore bin",
    run: input.onTrash,
    title: copy.openTrash,
  },
  ...toWorkspaceCommands(input),
  ...(input.projects ?? []).map((project) => toPinCommand(project)),
];

export { toHomeCommands };

export type { HomeCommand, HomeCommandsInput, HomeLayer };
