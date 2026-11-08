import type { RunLevel } from "@design-studio/contracts";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";

const USUAL_HINT = /^(?<head>.*?) \(usually (?<usual>[^,)]+)/u;

const levelLabel = (level: RunLevel): string => LEVEL_PRESETS[level].label;

const levelHint = (level: RunLevel): string => LEVEL_PRESETS[level].hint;

const levelShortHint = (level: RunLevel): string => {
  const { hint } = LEVEL_PRESETS[level];
  const match = USUAL_HINT.exec(hint);

  if (match) {
    return `${match[1]}, ${match[2]}`;
  }

  return hint.split(". ")[0] ?? hint;
};

interface LevelGist {
  readonly hint: string;
  readonly cost: string | null;
}

const levelGist = (level: RunLevel): LevelGist => {
  const match = USUAL_HINT.exec(LEVEL_PRESETS[level].hint);

  if (!match) {
    return { cost: null, hint: levelShortHint(level) };
  }

  return { cost: (match[2] ?? "").replace(" to ", "–"), hint: match[1] ?? "" };
};

export { levelGist, levelHint, levelLabel, levelShortHint };
