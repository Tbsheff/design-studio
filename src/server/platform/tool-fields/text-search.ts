import { z } from "zod";

import {
  TEXT_SEARCH_GLOB_MAX,
  TEXT_SEARCH_IDS_MAX,
  TEXT_SEARCH_QUERY_MAX,
  TEXT_SEARCH_REPLACE_MAX,
} from "../../../shared/text-search.js";

const HIT_ID_MAX = 1200;

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

export { searchTextFields, updateTextFields };
