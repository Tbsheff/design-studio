import { Schema } from "effect";

import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import {
  TEXT_SEARCH_GLOB_MAX,
  TEXT_SEARCH_IDS_MAX,
  TEXT_SEARCH_QUERY_MAX,
  TEXT_SEARCH_REPLACE_MAX,
} from "../text-search/deps.js";
import { TextSearchError } from "../text-search/errors.js";
import {
  SEARCH_TEXT_DESCRIPTION,
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
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
import { toOptional, toOptionalFlag, toOptionalText } from "./tool-input.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const RUN_SAVES =
  "The run saves this change in its version, like your file edits.";

const HIT_ID_MAX = 1200;

const searchTextFields = {
  caseSensitive: toOptionalFlag(
    "Match upper and lower case exactly. Default false."
  ),
  glob: toOptionalText(
    1,
    TEXT_SEARCH_GLOB_MAX,
    'A folder or glob in the project to search too, for example "src/components" or "src/**/*.tsx".'
  ),
  query: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TEXT_SEARCH_QUERY_MAX)
  ).annotate({
    description:
      "The text to find, or a regular expression when regex is true.",
  }),
  regex: toOptionalFlag(
    "Read query as a JavaScript regular expression. Default false."
  ),
  wholeWord: toOptionalFlag("Match only whole words. Default false."),
};

const hitIdText = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(HIT_ID_MAX)
);

const hitIdList = Schema.Array(hitIdText).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TEXT_SEARCH_IDS_MAX)
);

const updateTextFields = {
  ...searchTextFields,
  ids: toOptional(
    hitIdList,
    "The hit ids from search_text to change. Leave out to change all hits."
  ),
  replace: Schema.String.check(
    Schema.isMaxLength(TEXT_SEARCH_REPLACE_MAX)
  ).annotate({
    description:
      "The new text for each matched part. An empty string deletes the match.",
  }),
};

const searchTextInput = toSdkFieldSet(searchTextFields);

const updateTextInput = toSdkFieldSet(updateTextFields);

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
