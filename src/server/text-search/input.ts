import { z } from "zod";

import {
  TEXT_SEARCH_GLOB_MAX,
  TEXT_SEARCH_HITS_MAX,
  TEXT_SEARCH_IDS_MAX,
  TEXT_SEARCH_QUERY_MAX,
  TEXT_SEARCH_REPLACE_MAX,
} from "./deps.js";
import type { TextSearchQuery, TextUpdateRequest } from "./deps.js";

const HIT_ID_MAX = 1200;

const SEARCH_TEXT_DESCRIPTION = `Find visible text in the pages of this project: text nodes, the alt, placeholder, title and aria-label attributes, and string literals that are rendered as children, in HTML and JSX files. In an attached app it searches only the route and component files that the canvas frames use, plus the files in glob. Each hit gives its id (file:line:col), the layer source (the element that holds the text), a context snippet and the canvas frame. Text from a dynamic expression is not found. Up to ${TEXT_SEARCH_HITS_MAX} hits. Read only.`;

const UPDATE_TEXT_DESCRIPTION = `Replace text found by search_text: pass the same query and options, the new text in replace, and the hit ids to change (leave out ids to change all hits). Only the matched part changes; HTML and JSX entities in the rest of the text stay as they are, and the new text is escaped for its place. A dynamic expression is never changed. With regex, replace can use $1 and $<name>. Ids that no longer match are listed as stale. All changes are one version and one undo step.`;

const searchTextFields = {
  caseSensitive: z
    .boolean()
    .optional()
    .describe("Match upper and lower case exactly. Default false."),
  glob: z
    .string()
    .trim()
    .min(1)
    .max(TEXT_SEARCH_GLOB_MAX)
    .optional()
    .describe(
      'A folder or glob in the project to search too, for example "src/components" or "src/**/*.tsx".'
    ),
  query: z
    .string()
    .min(1)
    .max(TEXT_SEARCH_QUERY_MAX)
    .describe("The text to find, or a regular expression when regex is true."),
  regex: z
    .boolean()
    .optional()
    .describe("Read query as a JavaScript regular expression. Default false."),
  wholeWord: z
    .boolean()
    .optional()
    .describe("Match only whole words. Default false."),
};

const updateTextFields = {
  ...searchTextFields,
  ids: z
    .array(z.string().min(1).max(HIT_ID_MAX))
    .min(1)
    .max(TEXT_SEARCH_IDS_MAX)
    .optional()
    .describe(
      "The hit ids from search_text to change. Leave out to change all hits."
    ),
  replace: z
    .string()
    .max(TEXT_SEARCH_REPLACE_MAX)
    .describe(
      "The new text for each matched part. An empty string deletes the match."
    ),
};

type SearchTextInput = z.output<z.ZodObject<typeof searchTextFields>>;

type UpdateTextInput = z.output<z.ZodObject<typeof updateTextFields>>;

const toSearchQuery = (input: SearchTextInput): TextSearchQuery => ({
  caseSensitive: input.caseSensitive ?? false,
  glob: input.glob ?? null,
  query: input.query,
  regex: input.regex ?? false,
  wholeWord: input.wholeWord ?? false,
});

const toUpdateRequest = (input: UpdateTextInput): TextUpdateRequest => ({
  ...toSearchQuery(input),
  ids: input.ids ?? null,
  replace: input.replace,
});

export {
  SEARCH_TEXT_DESCRIPTION,
  searchTextFields,
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
  updateTextFields,
};

export type { SearchTextInput, UpdateTextInput };
