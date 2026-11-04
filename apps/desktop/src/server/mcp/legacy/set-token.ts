import { getDesignSystemDirectEdit } from "@design-studio/actions/direct-edit/get-design-system";
import { updateTokensDirectEdit } from "@design-studio/actions/direct-edit/update-tokens";
import type {
  CompiledTokenEntry,
  DesignSystemState,
  UpdateTokensResult,
} from "@design-studio/actions/_core/contracts";
import { callAction } from "../action-call.js";
import {
  EditError,
  loadTarget,
  oneLine,
  refuseWhileRunning,
} from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import { ok, versionActivity } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { tokenResult } from "./direct-edit-result.js";
import type { SetTokenInput } from "./direct-edit-schema.js";

type Theme = SetTokenInput["theme"];

interface TokenChange {
  darkValue?: string;
  path: string;
  value?: string;
}

const SUMMARY_VALUE_MAX = 60;

const missingText = (state: DesignSystemState, name: string): string => {
  if (state.entries.length === 0) {
    return "This direction has no tokens. Use get_tokens to check.";
  }

  return `No token ${name}. Use get_tokens for the names.`;
};

const findEntry = (
  state: DesignSystemState,
  name: string
): CompiledTokenEntry => {
  const entry = state.entries.find(
    (item) => item.cssVar === name || item.path === name
  );

  if (!entry) {
    throw new EditError(missingText(state, name));
  }

  return entry;
};

const tokenChange = (
  entry: CompiledTokenEntry,
  input: SetTokenInput
): TokenChange => {
  if (input.theme === "dark") {
    return { darkValue: input.value, path: entry.path };
  }

  return { path: entry.path, value: input.value };
};

const themeText = (theme: Theme): string => {
  if (theme === "dark") {
    return " (dark)";
  }

  return "";
};

const setToken = async (
  deps: EditDeps,
  input: SetTokenInput
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  refuseWhileRunning(deps, project, direction);

  const target = { directionId: direction.id, projectId: project.id };

  const state = await callAction<DesignSystemState>(
    deps,
    getDesignSystemDirectEdit,
    target
  );

  const entry = findEntry(state, input.name);

  const result = await callAction<UpdateTokensResult>(
    deps,
    updateTokensDirectEdit,
    { ...target, changes: [tokenChange(entry, input)] }
  );

  const after =
    result.state.entries.find((item) => item.path === entry.path) ?? entry;

  const summary = `Set ${entry.cssVar}${themeText(input.theme)} to ${oneLine(input.value, SUMMARY_VALUE_MAX)}`;

  return {
    activity: versionActivity(project, direction, summary, result.version),
    result: ok(
      tokenResult({
        after,
        cssVar: entry.cssVar,
        theme: input.theme,
        version: result.version,
      })
    ),
  };
};

export { setToken };
