import { LEVEL_PRESETS, matchesKey } from "./deps.js";
import type { ComposerMode, KeyInput, RunLevel } from "./deps.js";
import { IS_MAC } from "./key-model.js";
import { collectCommands } from "./registry.js";
import type { Command } from "./registry.js";

const MODE_ORDER: ComposerMode[] = ["edit", "plan", "critique"];

const MODE_TITLES: Record<ComposerMode, string> = {
  critique: "Critique mode: the agent reviews only",
  edit: "Edit mode: the agent changes files",
  plan: "Plan mode: the agent writes a plan first",
};

export function nextMode(mode: ComposerMode, step: 1 | -1 = 1): ComposerMode {
  const at = MODE_ORDER.indexOf(mode);

  return (
    MODE_ORDER[(at + step + MODE_ORDER.length) % MODE_ORDER.length] ?? "edit"
  );
}

export function isModeCycleKey(event: KeyInput): boolean {
  return matchesKey("composer-mode", event, IS_MAC);
}

export interface ComposerActions {
  mode: ComposerMode;
  setMode: (mode: ComposerMode) => void;
  level: RunLevel;
  setLevel: (level: RunLevel) => void;
  variations:
    | { count: number; max: number; onCount: (count: number) => void }
    | undefined;
  focus: () => void;
}

export function composerCommands(a: ComposerActions): Command[] {
  const modes = MODE_ORDER.map((mode) => ({
    group: "Run",
    icon: "chat" as const,
    id: `composer.mode-${mode}`,
    keywords: "mode composer",
    run: () => {
      a.setMode(mode);
      a.focus();
    },
    slash: mode,
    title: MODE_TITLES[mode],
    ...(a.mode === mode ? { disabled: "Already on" } : {}),
  }));

  const levels = (Object.keys(LEVEL_PRESETS) as RunLevel[]).map((level) => ({
    group: "Run",
    icon: "sliders" as const,
    id: `composer.level-${level}`,
    keywords: "quality speed cost",
    run: () => {
      a.setLevel(level);
      a.focus();
    },
    slash: `level ${level}`,
    title: `Level: ${LEVEL_PRESETS[level].label}`,
    ...(a.level === level ? { disabled: "Already on" } : {}),
  }));

  const v = a.variations;

  const variations: Command[] = v
    ? [
        {
          group: "Run",
          icon: "compare",
          id: "composer.variations",
          keywords: "directions options alternatives",
          run: () => {
            v.onCount(Math.min(3, v.max));
            a.focus();
          },
          slash: "variations",
          title: `Make ${Math.min(3, v.max)} variations of the next prompt`,
        },
      ]
    : [];

  return [...modes, ...levels, ...variations];
}

const SLASH_OF: Record<string, string> = {
  "edit.undo": "undo",
  "panel.comments": "comments",
  "panel.versions": "versions",
  "project.design-md": "design-md",
  "project.settings": "settings",
  "run.polish": "polish",
  "version.export": "export",
};

export function slashCommands(): Command[] {
  return collectCommands()
    .map((c) =>
      c.slash || !SLASH_OF[c.id] ? c : { ...c, slash: SLASH_OF[c.id] }
    )
    .filter((c) => c.slash);
}
