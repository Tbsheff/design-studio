import { toReason, withDisabled } from "./command-disabled.js";
import {
  DEV_STATUS_MARK_COMMAND,
  DEV_STATUS_MARK_EVENT,
  DEV_STATUS_OPEN_COMMAND,
  DEV_STATUS_OPEN_EVENT,
  IMPACT_OPEN_COMMAND,
  IMPACT_OPEN_EVENT,
  findElement,
  requestProjectRename,
} from "./deps.js";
import { panelCommands } from "./panel-commands.js";
import type { Command } from "./registry.js";
import type { StudioActions } from "./studio-actions.js";
import { moveRegion } from "./studio-regions.js";
import { toolCommands } from "./tool-commands.js";

const MIN_DIRECTIONS = 2;
const COMPOSER_SELECTOR = '.prompt [data-slot="composer-input"]';

const idle = (): void => globalThis.console.debug("idle");

const stepDirection = (
  studioActions: StudioActions,
  step: 1 | -1
): (() => void) | null => {
  if (studioActions.directions.length < MIN_DIRECTIONS) {
    return null;
  }

  const at = studioActions.directions.findIndex(
    (delta) => delta.id === studioActions.directionId
  );

  const next =
    studioActions.directions[
      (at + step + studioActions.directions.length) %
        studioActions.directions.length
    ];

  if (next) {
    return () => studioActions.onDirection(next.id);
  }

  return null;
};

const focusComposer = (studioActions: StudioActions): void => {
  studioActions.onPanel("chat");
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, COMPOSER_SELECTOR)?.focus()
  );
};

const goCommands = (studioActions: StudioActions): Command[] => {
  const noDirection = toReason(
    studioActions.directions.length < MIN_DIRECTIONS,
    "Only one direction"
  );

  return [
    {
      group: "Go",
      icon: "folder",
      id: "go.home",
      keyId: "home",
      keywords: "projects back exit",
      run: studioActions.onHome,
      title: "Go to Home",
    },
    {
      group: "Go",
      icon: "settings",
      id: "project.settings",
      keyId: "settings",
      keywords: "model shell preferences",
      run: studioActions.onSettings,
      title: "Project settings",
    },
    {
      group: "Go",
      icon: "doc",
      id: "project.design-md",
      keywords: "design system brief",
      run: studioActions.onDesignMd,
      title: "Edit DESIGN.md",
    },
    withDisabled(
      {
        group: "Go",
        icon: "branch",
        id: "direction.next",
        keyId: "next-direction",
        run: stepDirection(studioActions, 1) ?? idle,
        title: "Next direction",
      },
      noDirection
    ),
    withDisabled(
      {
        group: "Go",
        icon: "branch",
        id: "direction.prev",
        keyId: "prev-direction",
        run: stepDirection(studioActions, -1) ?? idle,
        title: "Previous direction",
      },
      noDirection
    ),
  ];
};

const projectCommands = (studioActions: StudioActions): Command[] => [
  {
    group: "Go",
    icon: "pencil",
    id: "project.rename",
    keywords: "name title project",
    run: requestProjectRename,
    title: "Rename project",
  },
  {
    group: "Go",
    icon: "copy",
    id: "project.duplicate",
    keywords: "copy clone project",
    run: studioActions.onDuplicate,
    title: "Duplicate project",
  },
  {
    group: "Go",
    icon: "trash",
    id: "project.trash",
    keywords: "delete remove project",
    run: studioActions.onTrash,
    title: "Move project to trash",
  },
];

const directionCommands = (studioActions: StudioActions): Command[] =>
  studioActions.directions.flatMap((direction) => {
    if (direction.id === studioActions.directionId) {
      return [];
    }

    return [
      {
        group: "Go",
        icon: "branch" as const,
        id: `direction.open.${direction.id}`,
        keywords: "switch variation",
        run: () => studioActions.onDirection(direction.id),
        title: `Open direction ${direction.name}`,
      },
    ];
  });

const toStatesReason = (studioActions: StudioActions): string | null => {
  if (studioActions.running) {
    return "A run is going";
  }

  return toReason(studioActions.onMakeStates === null, "No direction yet");
};

const runCommands = (studioActions: StudioActions): Command[] => [
  {
    group: "Run",
    icon: "chat",
    id: "panel.focus-composer",
    keywords: "composer prompt message chat",
    run: () => focusComposer(studioActions),
    title: "Ask the agent",
  },
  withDisabled(
    {
      group: "Run",
      icon: "stop",
      id: "run.stop",
      keyId: "stop",
      keywords: "cancel interrupt",
      run: studioActions.onStop,
      title: "Stop the run",
    },
    toReason(!studioActions.running, "No run is going")
  ),
  withDisabled(
    {
      group: "Run",
      icon: "sparkle",
      id: "run.polish",
      keywords: "improve refine critique",
      run: studioActions.onPolish,
      title: "Polish this design",
    },
    toReason(studioActions.running, "A run is going")
  ),
  withDisabled(
    {
      group: "Run",
      icon: "layers",
      id: "run.states",
      keywords: "empty loading error success validation menu frames",
      run: () => studioActions.onMakeStates?.(),
      slash: "states",
      title: "Make UI states of this page",
    },
    toStatesReason(studioActions)
  ),
];

const toShipCommands = (studioActions: StudioActions): Command[] => {
  if (!studioActions.onShip) {
    return [];
  }

  return [
    {
      group: "Version",
      icon: "branch",
      id: "version.ship",
      keywords: "share branch git commit push pull request github gh",
      run: studioActions.onShip,
      title: "Ship as a pull request…",
    },
  ];
};

const versionCommands = (studioActions: StudioActions): Command[] => [
  withDisabled(
    {
      group: "Version",
      icon: "undo",
      id: "edit.undo",
      keyId: "undo",
      run: studioActions.onUndo,
      title: "Undo",
    },
    toReason(!studioActions.canUndo, "Nothing to undo")
  ),
  withDisabled(
    {
      group: "Version",
      icon: "restore",
      id: "edit.redo",
      keyId: "redo",
      run: studioActions.onRedo,
      title: "Redo",
    },
    toReason(!studioActions.canRedo, "Nothing to redo")
  ),
  withDisabled(
    {
      group: "Version",
      icon: "download",
      id: "version.export",
      keywords: "share download png pdf html handoff zip source files",
      run: () => {
        if (studioActions.exportId) {
          studioActions.onExport(studioActions.exportId);
        }
      },
      title: "Export…",
    },
    toReason(!studioActions.exportId, "No version yet")
  ),
  ...toShipCommands(studioActions),
];

const devStatusCommands = (): Command[] => [
  {
    group: "View",
    icon: "doc",
    id: DEV_STATUS_OPEN_COMMAND,
    keywords: "handoff ready build developer status changed",
    run: () => globalThis.dispatchEvent(new CustomEvent(DEV_STATUS_OPEN_EVENT)),
    title: "Dev status",
  },
  {
    group: "View",
    icon: "check",
    id: DEV_STATUS_MARK_COMMAND,
    keywords: "handoff ready build developer status",
    run: () => globalThis.dispatchEvent(new CustomEvent(DEV_STATUS_MARK_EVENT)),
    title: "Mark selected frame ready for dev",
  },
];

const impactCommands = (): Command[] => [
  {
    group: "View",
    icon: "check",
    id: IMPACT_OPEN_COMMAND,
    keywords: "impact shared component edit routes pages compare baseline",
    run: () => globalThis.dispatchEvent(new CustomEvent(IMPACT_OPEN_EVENT)),
    title: "Check other pages",
  },
];

const studioCommands = (studioActions: StudioActions): Command[] => [
  ...goCommands(studioActions),
  ...projectCommands(studioActions),
  ...directionCommands(studioActions),
  ...panelCommands(studioActions),
  ...toolCommands(),
  ...runCommands(studioActions),
  ...versionCommands(studioActions),
  ...devStatusCommands(),
  ...impactCommands(),
  {
    group: "View",
    icon: "sidebar",
    id: "view.next-region",
    keyId: "focus-next-region",
    keywords: "f6 toolbar canvas inspector chat",
    run: () => moveRegion(1),
    title: "Focus the next region",
  },
];

export { studioCommands };
