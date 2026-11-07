import { TOKENS_FILE } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  Direction,
  Project,
  TokenChange,
} from "@design-studio/contracts";

import type { DirectEditDeps } from "../direct-edit/index.js";
import { appTokensFor } from "./app-tokens/source.js";
import { updateAppTokens } from "./app-tokens/write.js";
import { readDesignSystemFiles } from "./sync.js";
import { updateTokensTitled } from "./update-tokens.js";

const APPLY_TITLE = "Apply theme";

interface ThemeTokenBase {
  readonly entries: readonly CompiledTokenEntry[];
  readonly file: string;
}

interface ThemeTokensWritten {
  readonly file: string;
  readonly versionId: string;
}

const getThemeTokenBase = async (
  project: Project,
  direction: Direction
): Promise<ThemeTokenBase | null> => {
  const app = await appTokensFor(project, direction);

  if (app) {
    return { entries: app.entries, file: app.file };
  }

  const files = await readDesignSystemFiles(direction.workTree);

  if (files === null || files.tokens === null) {
    return null;
  }

  return { entries: files.entries, file: TOKENS_FILE };
};

const updateThemeTokens = async (
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  changes: readonly TokenChange[]
): Promise<ThemeTokensWritten> => {
  const request = { raw: { changes }, title: APPLY_TITLE };
  const app = await updateAppTokens(deps, project, direction, request);

  if (app) {
    const found = await appTokensFor(project, direction);

    return { file: found?.file ?? "", versionId: app.version.id };
  }

  const written = await updateTokensTitled(deps, project, direction, request);

  return { file: TOKENS_FILE, versionId: written.version.id };
};

export { APPLY_TITLE, getThemeTokenBase, updateThemeTokens };

export type { ThemeTokenBase, ThemeTokensWritten };
