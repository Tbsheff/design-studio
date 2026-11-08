import { readFile } from "node:fs/promises";

import type { SpacingScope } from "./commit.js";
import {
  elementClassInfo,
  resolveSource,
  themeForFile,
  tokenEntriesFor,
} from "./deps.js";
import type { CompiledTokenEntry, SourceLoc, TailwindTheme } from "./deps.js";

interface SpacingSite {
  readonly classes: readonly string[];
  readonly entries: readonly CompiledTokenEntry[];
  readonly mode: "classes" | "css";
  readonly relative: string;
  readonly theme: TailwindTheme | null;
}

const toModeOf = (tailwind: boolean): SpacingSite["mode"] => {
  if (tailwind) {
    return "classes";
  }

  return "css";
};

const toLoadSpacingSite = async (
  scope: SpacingScope,
  loc: SourceLoc
): Promise<SpacingSite> => {
  const resolved = await resolveSource(scope.workTree, loc.file);

  const [text, info, tokens] = await Promise.all([
    readFile(resolved.file, "utf-8"),
    elementClassInfo(scope.workTree, scope.project.kind, loc),
    tokenEntriesFor(scope.project, scope.direction),
  ]);

  const theme = await themeForFile(scope.workTree, resolved.relative, text, {
    projectKind: scope.project.kind,
  });

  const tailwind = info.tailwind?.mode === "classes" && theme !== null;

  return {
    classes: info.tailwind?.classes ?? [],
    entries: tokens,
    mode: toModeOf(tailwind),
    relative: resolved.relative,
    theme,
  };
};

export { toLoadSpacingSite as loadSpacingSite };

export type { SpacingSite };
