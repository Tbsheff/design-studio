import { TextSearchError } from "../text-search/errors.js";
import {
  SEARCH_TEXT_DESCRIPTION,
  searchTextFields,
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
  updateTextFields,
} from "../text-search/input.js";
import type { SearchTextInput, UpdateTextInput } from "../text-search/input.js";
import type { SearchTarget } from "../text-search/scope.js";
import { searchText } from "../text-search/search-text.js";
import {
  planTextUpdate,
  resultOf,
  writeTextUpdate,
} from "../text-search/update-text.js";
import { canvasFrames, refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const RUN_SAVES =
  "The run saves this change in its version, like your file edits.";

const searchTextInput = searchTextFields;

const updateTextInput = updateTextFields;

const searchTextDescription = SEARCH_TEXT_DESCRIPTION;

const updateTextDescription = UPDATE_TEXT_DESCRIPTION;

const textOf = (message: string, isError: boolean): ToolText => {
  if (isError) {
    return { content: [{ text: message, type: "text" }], isError: true };
  }

  return { content: [{ text: message, type: "text" }] };
};

const targetOf = async (deps: DirectToolDeps): Promise<SearchTarget> => ({
  direction: deps.ctx.direction,
  frames: await canvasFrames(deps),
  project: deps.ctx.project,
});

const guarded = async (
  tool: string,
  run: () => Promise<ToolText>
): Promise<ToolText> => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof TextSearchError) {
      return textOf(`${tool}: ${error.message}`, true);
    }

    throw error;
  }
};

const runSearchText = (
  deps: DirectToolDeps,
  args: SearchTextInput
): Promise<ToolText> =>
  guarded("search_text", async () => {
    const target = await targetOf(deps);
    const result = await searchText(target, toSearchQuery(args));

    return textOf(JSON.stringify(result, null, 2), false);
  });

const writeUpdate = async (
  deps: DirectToolDeps,
  args: UpdateTextInput
): Promise<ToolText> => {
  const target = await targetOf(deps);
  const plan = await planTextUpdate(target, toUpdateRequest(args));

  const problem = plan.changed
    .map((file) => writeProblem(deps.ctx, file.relative))
    .find((item) => item !== null);

  if (problem) {
    return textOf(problem, true);
  }

  await writeTextUpdate(plan);

  const result = { ...resultOf(plan, null), saved: RUN_SAVES };

  return textOf(JSON.stringify(result, null, 2), false);
};

const runUpdateText = (
  deps: DirectToolDeps,
  args: UpdateTextInput
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "update_text");

  if (blocked) {
    return Promise.resolve(textOf(blocked, true));
  }

  return guarded("update_text", () => writeUpdate(deps, args));
};

export {
  runSearchText,
  runUpdateText,
  searchTextDescription,
  searchTextInput,
  updateTextDescription,
  updateTextInput,
};
