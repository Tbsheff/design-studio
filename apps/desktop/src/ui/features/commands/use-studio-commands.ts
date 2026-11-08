import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { findElement, isTypingTarget, matchesKey } from "./deps.js";
import type { KeyId, PanelTab } from "./deps.js";
import { IS_MAC } from "./key-model.js";
import { listenForCommands, runCommand, useCommands } from "./registry.js";
import type { Command } from "./registry.js";

const PROMPT_REGION = 3;

interface StudioActions {
  running: boolean;
  directions: { id: string; name: string }[];
  directionId: string | null;
  onHome: () => void;
  onSettings: () => void;
  onDesignMd: () => void;
  onPanel: (tab: PanelTab) => void;
  onDirection: (id: string) => void;
  onStop: () => void;
  onPolish: () => void;
  onMakeStates: (() => void) | null;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  exportId: string | null;
  onExport: (versionId: string) => void;
  onShip: (() => void) | null;
}

const PANELS: { tab: PanelTab; title: string; icon: Command["icon"] }[] = [
  { icon: "chat", tab: "chat", title: "Show Chat" },
  { icon: "pointer", tab: "design", title: "Edit mode: inspector and layers" },
  { icon: "comment", tab: "comments", title: "Show Comments" },
  { icon: "history", tab: "versions", title: "Show Versions" },
  { icon: "token", tab: "tokens", title: "Show Tokens" },
  { icon: "component", tab: "components", title: "Show Components" },
  { icon: "sliders", tab: "tweaks", title: "Show Tweaks" },
  { icon: "palette", tab: "system", title: "Show Design system" },
];

const REGIONS = [
  ".canvas .toolbar button:not(:disabled)",
  ".canvas .stage",
  ".pane-left .pane-project",
  '.prompt [data-slot="composer-input"]',
];

const regionOf = (element: Element | null): number => {
  if (!element) {
    return -1;
  }

  if (element.closest(".canvas .toolbar")) {
    return 0;
  }

  if (element.closest(".canvas .stage")) {
    return 1;
  }

  if (element.closest(".prompt")) {
    return PROMPT_REGION;
  }

  if (element.closest(".pane-left")) {
    return 2;
  }

  return -1;
};

const moveRegion = (step: 1 | -1): void => {
  const from = regionOf(document.activeElement);

  for (let idx = 1; idx <= REGIONS.length; idx += 1) {
    const index =
      ((((from < 0 ? (step === 1 ? -1 : 0) : from) + step * idx) %
        REGIONS.length) +
        REGIONS.length) %
      REGIONS.length;

    const target = findElement(document.body, REGIONS[index] ?? "");

    if (!target || target.getClientRects().length === 0) {
      continue;
    }

    target.focus({ preventScroll: true });

    return;
  }
};

const stepDirection = (
  studioActions: StudioActions,
  step: 1 | -1
): (() => void) | null => {
  if (studioActions.directions.length < 2) {
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

const studioCommands = (first: StudioActions): Command[] => {
  const next = stepDirection(first, 1);
  const prev = stepDirection(first, -1);

  const noDirection =
    first.directions.length < 2 ? "Only one direction" : undefined;

  return [
    {
      group: "Go",
      icon: "folder",
      id: "go.home",
      keyId: "home",
      keywords: "projects back exit",
      run: first.onHome,
      title: "Go to Home",
    },
    {
      group: "Go",
      icon: "settings",
      id: "project.settings",
      keyId: "settings",
      keywords: "model shell preferences",
      run: first.onSettings,
      title: "Project settings",
    },
    {
      group: "Go",
      icon: "doc",
      id: "project.design-md",
      keywords: "design system brief",
      run: first.onDesignMd,
      title: "Edit DESIGN.md",
    },
    {
      group: "Go",
      icon: "branch",
      id: "direction.next",
      keyId: "next-direction",
      run: next ?? (() => undefined),
      title: "Next direction",
      ...(noDirection ? { disabled: noDirection } : {}),
    },
    {
      group: "Go",
      icon: "branch",
      id: "direction.prev",
      keyId: "prev-direction",
      run: prev ?? (() => undefined),
      title: "Previous direction",
      ...(noDirection ? { disabled: noDirection } : {}),
    },
    ...first.directions
      .filter((diff) => diff.id !== first.directionId)
      .map((diffNext) => ({
        group: "Go",
        icon: "branch" as const,
        id: `direction.open.${diffNext.id}`,
        keywords: "switch variation",
        run: () => first.onDirection(diffNext.id),
        title: `Open direction ${diffNext.name}`,
      })),
    ...PANELS.map((part) => ({
      group: "Panels",
      icon: part.icon,
      id: `panel.${part.tab}`,
      keywords: "tab side panel pane mode sheet",
      run: () => first.onPanel(part.tab),
      title: part.title,
    })),
    {
      group: "Run",
      icon: "chat",
      id: "panel.focus-composer",
      keywords: "composer prompt message chat",
      run: () => focusComposer(first),
      title: "Ask the agent",
    },
    {
      group: "Run",
      icon: "stop",
      id: "run.stop",
      keyId: "stop",
      keywords: "cancel interrupt",
      run: first.onStop,
      title: "Stop the run",
      ...(first.running ? {} : { disabled: "No run is going" }),
    },
    {
      group: "Run",
      icon: "sparkle",
      id: "run.polish",
      keywords: "improve refine critique",
      run: first.onPolish,
      title: "Polish this design",
      ...(first.running ? { disabled: "A run is going" } : {}),
    },
    {
      group: "Run",
      icon: "layers",
      id: "run.states",
      keywords: "empty loading error success validation menu frames",
      run: () => first.onMakeStates?.(),
      slash: "states",
      title: "Make UI states of this page",
      ...(first.running
        ? { disabled: "A run is going" }
        : first.onMakeStates
          ? {}
          : { disabled: "No direction yet" }),
    },
    {
      group: "Version",
      icon: "undo",
      id: "edit.undo",
      keyId: "undo",
      run: first.onUndo,
      title: "Undo",
      ...(first.canUndo ? {} : { disabled: "Nothing to undo" }),
    },
    {
      group: "Version",
      icon: "restore",
      id: "edit.redo",
      keyId: "redo",
      run: first.onRedo,
      title: "Redo",
      ...(first.canRedo ? {} : { disabled: "Nothing to redo" }),
    },
    {
      group: "Version",
      icon: "download",
      id: "version.export",
      keywords: "share download png pdf html handoff zip source files",
      run: () => first.exportId && first.onExport(first.exportId),
      title: "Export…",
      ...(first.exportId ? {} : { disabled: "No version yet" }),
    },
    ...(first.onShip
      ? [
          {
            group: "Version",
            icon: "branch" as const,
            id: "version.ship",
            keywords: "share branch git commit push pull request github gh",
            run: first.onShip,
            title: "Ship as a pull request…",
          },
        ]
      : []),
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
};

const focusComposer = (a: StudioActions): void => {
  a.onPanel("chat");
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, '.prompt [data-slot="composer-input"]')?.focus()
  );
};

const KEYED: [KeyId, string][] = [
  ["home", "go.home"],
  ["settings", "project.settings"],
  ["next-direction", "direction.next"],
  ["prev-direction", "direction.prev"],
];

const useStudioKeys = (): void => {
  useEffect(() => {
    listenForCommands();

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (
        event.key === "F6" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        moveRegion(event.shiftKey ? -1 : 1);

        return;
      }

      if (findElement(document.body, '[role="dialog"][aria-modal="true"]')) {
        return;
      }

      const hit = KEYED.find(([key]) => matchesKey(key, event, IS_MAC));

      if (
        !hit ||
        (isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey)
      ) {
        return;
      }

      event.preventDefault();
      runCommand(hit[1]);
    };

    globalThis.addEventListener("keydown", onKey);

    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const useStudioCommands = (): RefObject<StudioActions | null> => {
  const actions = useRef<StudioActions | null>(null);
  useCommands(() => (actions.current ? studioCommands(actions.current) : []));
  useStudioKeys();

  return actions;
};

export { moveRegion, useStudioCommands };

export type { StudioActions };
