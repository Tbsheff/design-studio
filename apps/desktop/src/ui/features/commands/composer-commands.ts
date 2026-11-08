import { toReason, withDisabled } from "./command-disabled.js";
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

const toModeCommand = (
  composerActions: ComposerActions,
  mode: ComposerMode
): Command =>
  withDisabled(
    {
      group: "Run",
      icon: "chat",
      id: `composer.mode-${mode}`,
      keywords: "mode composer",
      run: (): void => {
        composerActions.setMode(mode);
        composerActions.focus();
      },
      slash: mode,
      title: MODE_TITLES[mode],
    },
    toReason(composerActions.mode === mode, "Already on")
  );

const toLevelCommand = (
  composerActions: ComposerActions,
  level: RunLevel
): Command =>
  withDisabled(
    {
      group: "Run",
      icon: "sliders",
      id: `composer.level-${level}`,
      keywords: "quality speed cost",
      run: (): void => {
        composerActions.setLevel(level);
        composerActions.focus();
      },
      slash: `level ${level}`,
      title: `Level: ${LEVEL_PRESETS[level].label}`,
    },
    toReason(composerActions.level === level, "Already on")
  );

const toVariationCommands = (composerActions: ComposerActions): Command[] => {
  const callback = composerActions.variations;

  if (!callback) {
    return [];
  }

  const count = Math.min(VARIATION_COUNT, callback.max);

  return [
    {
      group: "Run",
      icon: "compare",
      id: "composer.variations",
      keywords: "directions options alternatives",
      run: () => {
        callback.onCount(count);
        composerActions.focus();
      },
      slash: "variations",
      title: `Make ${count} variations of the next prompt`,
    },
  ];
};

const composerCommands = (composerActions: ComposerActions): Command[] => [
  ...MODE_ORDER.map((mode) => toModeCommand(composerActions, mode)),
  ...(Object.keys(LEVEL_PRESETS) as RunLevel[]).map((level) =>
    toLevelCommand(composerActions, level)
  ),
  ...toVariationCommands(composerActions),
];

const SLASH_OF = new Map([
  ["edit.undo", "undo"],
  ["panel.comments", "comments"],
  ["panel.versions", "versions"],
  ["project.design-md", "design-md"],
  ["project.settings", "settings"],
  ["run.polish", "polish"],
  ["version.export", "export"],
]);

const slashCommands = (): Command[] =>
  collectCommands().flatMap((command) => {
    const slash = command.slash ?? SLASH_OF.get(command.id);

    if (!slash) {
      return [];
    }

    return [{ ...command, slash }];
  });

export { composerCommands, isModeCycleKey, nextMode, slashCommands };

export type { ComposerActions };
