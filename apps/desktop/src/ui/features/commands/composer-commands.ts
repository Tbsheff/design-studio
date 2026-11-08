import { LEVEL_PRESETS, matchesKey } from "./deps.js";
import type { ComposerMode, KeyInput, RunLevel } from "./deps.js";
import { IS_MAC } from "./key-model.js";
import { collectCommands } from "./registry.js";
import type { Command } from "./registry.js";

const VARIATION_COUNT = 3;

const MODE_ORDER: ComposerMode[] = ["edit", "plan", "critique"];

const MODE_TITLES: Record<ComposerMode, string> = {
  critique: "Critique mode: the agent reviews only",
  edit: "Edit mode: the agent changes files",
  plan: "Plan mode: the agent writes a plan first",
};

const nextMode = (mode: ComposerMode, step: 1 | -1 = 1): ComposerMode => {
  const at = MODE_ORDER.indexOf(mode);

  return (
    MODE_ORDER[(at + step + MODE_ORDER.length) % MODE_ORDER.length] ?? "edit"
  );
};

const isModeCycleKey = (event: KeyInput): boolean =>
  matchesKey("composer-mode", event, IS_MAC);

interface ComposerActions {
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  level: RunLevel;
  setLevel: (level: RunLevel) => void;
  variations:
    | { count: number; max: number; onCount: (count: number) => void }
    | undefined;
  focus: () => void;
}

const composerCommands = (composerActions: ComposerActions): Command[] => {
  const modes = MODE_ORDER.map((mode) => ({
    group: "Run",
    icon: "chat" as const,
    id: `composer.mode-${mode}`,
    keywords: "mode composer",
    run: (): void => {
      composerActions.setMode(mode);
      composerActions.focus();
    },
    slash: mode,
    title: MODE_TITLES[mode],
    ...(composerActions.mode === mode ? { disabled: "Already on" } : {}),
  }));

  const levels = (Object.keys(LEVEL_PRESETS) as RunLevel[]).map((level) => ({
    group: "Run",
    icon: "sliders" as const,
    id: `composer.level-${level}`,
    keywords: "quality speed cost",
    run: (): void => {
      composerActions.setLevel(level);
      composerActions.focus();
    },
    slash: `level ${level}`,
    title: `Level: ${LEVEL_PRESETS[level].label}`,
    ...(composerActions.level === level ? { disabled: "Already on" } : {}),
  }));

  const callback = composerActions.variations;

  const variations: Command[] = callback
    ? [
        {
          group: "Run",
          icon: "compare",
          id: "composer.variations",
          keywords: "directions options alternatives",
          run: () => {
            callback.onCount(Math.min(VARIATION_COUNT, callback.max));
            composerActions.focus();
          },
          slash: "variations",
          title: `Make ${Math.min(VARIATION_COUNT, callback.max)} variations of the next prompt`,
        },
      ]
    : [];

  return [...modes, ...levels, ...variations];
};

const SLASH_OF: Record<string, string> = {
  "edit.undo": "undo",
  "panel.comments": "comments",
  "panel.versions": "versions",
  "project.design-md": "design-md",
  "project.settings": "settings",
  "run.polish": "polish",
  "version.export": "export",
};

const slashCommands = (): Command[] =>
  collectCommands()
    .map((command) => {
      if (command.slash || !SLASH_OF[command.id]) {
        return command;
      }

      return { ...command, slash: SLASH_OF[command.id] };
    })
    .filter((char) => char.slash);

export { nextMode, isModeCycleKey, composerCommands, slashCommands };

export type { ComposerActions };
