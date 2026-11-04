import { TEXT_SEARCH_HITS_MAX } from "./deps.js";
import type { TextSearchQuery, TextUpdateRequest } from "./deps.js";

const SEARCH_TEXT_DESCRIPTION = `Find visible text in the pages of this project: text nodes, the alt, placeholder, title and aria-label attributes, and string literals that are rendered as children, in HTML and JSX files. In an attached app it searches only the route and component files that the canvas frames use, plus the files in glob. Each hit gives its id (file:line:col), the layer source (the element that holds the text), a context snippet and the canvas frame. Text from a dynamic expression is not found. Up to ${TEXT_SEARCH_HITS_MAX} hits. Read only.`;

const UPDATE_TEXT_DESCRIPTION = `Replace text found by search_text: pass the same query and options, the new text in replace, and the hit ids to change (leave out ids to change all hits). Only the matched part changes; HTML and JSX entities in the rest of the text stay as they are, and the new text is escaped for its place. A dynamic expression is never changed. With regex, replace can use $1 and $<name>. Ids that no longer match are listed as stale. All changes are one version and one undo step.`;

interface SearchTextInput {
  readonly caseSensitive?: boolean | undefined;
  readonly glob?: string | undefined;
  readonly query: string;
  readonly regex?: boolean | undefined;
  readonly wholeWord?: boolean | undefined;
}

interface UpdateTextInput extends SearchTextInput {
  readonly ids?: string[] | undefined;
  readonly replace: string;
}

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
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
};

export type { SearchTextInput, UpdateTextInput };
