import { compileTokens, parseTokenFile } from "../compile.js";
import { DARK_MODE_EXTENSION, toHarvestDarkMode } from "./dark-trigger.js";
import { applySourceVars } from "./source-vars.js";
import type { TokenTree } from "./source-vars.js";
import type { ExtraToken, Harvest } from "./types.js";

type ThemeMode = "light" | "dark";

interface PickedSource {
  readonly entry: { readonly source: string };
  readonly sourceVar?: string;
}

const toAppVars = (
  picks: ReadonlyMap<string, PickedSource>
): Map<string, string> => {
  const appVars = new Map<string, string>();

  for (const [token, pick] of picks) {
    if (pick.sourceVar && pick.entry.source !== "base") {
      appVars.set(pick.sourceVar, token);
    }
  }

  return appVars;
};

const setDarkModeExtension = (
  tokens: TokenTree,
  harvests: readonly Harvest[]
): void => {
  const darkMode = toHarvestDarkMode(harvests);
  const previous = tokens.$extensions;

  if (darkMode === null) {
    return;
  }

  let kept = {};

  if (previous instanceof Object && !Array.isArray(previous)) {
    kept = previous;
  }

  tokens.$extensions = { ...kept, [DARK_MODE_EXTENSION]: { ...darkMode } };
};

const applySourceTokens = (
  tokens: TokenTree,
  harvests: readonly Harvest[],
  mode: ThemeMode,
  picks: ReadonlyMap<string, PickedSource>
): void => {
  const appVars = toAppVars(picks);

  for (const vars of harvests.flatMap((harvest) => harvest.sourceVars ?? [])) {
    const { file } = parseTokenFile(JSON.stringify(tokens));

    if (file) {
      const { entries } = compileTokens(file);

      applySourceVars({ appVars, entries, mode, tokens, vars });
    }
  }

  setDarkModeExtension(tokens, harvests);
};

const toExtrasAfterSource = (
  tokens: TokenTree,
  harvests: readonly Harvest[],
  mode: ThemeMode,
  picks: ReadonlyMap<string, PickedSource>
): ExtraToken[] => {
  applySourceTokens(tokens, harvests, mode, picks);

  return harvests.flatMap((harvest) => harvest.extras ?? []);
};

export { toExtrasAfterSource };

export type { TokenTree };
