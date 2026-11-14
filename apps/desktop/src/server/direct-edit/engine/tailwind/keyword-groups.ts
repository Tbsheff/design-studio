import type { SingleGroup } from "./classes.js";

const NAMES_BY_GROUP: readonly (readonly [SingleGroup, readonly string[]])[] = [
  ["bg-image", ["bg-none"]],
  [
    "bg-repeat",
    [
      "bg-no-repeat",
      "bg-repeat",
      "bg-repeat-round",
      "bg-repeat-space",
      "bg-repeat-x",
      "bg-repeat-y",
    ],
  ],
  ["bg-size", ["bg-auto", "bg-contain", "bg-cover"]],
  ["case", ["capitalize", "lowercase", "normal-case", "uppercase"]],
  ["decoration", ["line-through", "no-underline", "overline", "underline"]],
  [
    "display",
    [
      "block",
      "contents",
      "flex",
      "flow-root",
      "grid",
      "hidden",
      "inline",
      "inline-block",
      "inline-flex",
      "inline-grid",
      "list-item",
      "table",
    ],
  ],
  ["filter", ["filter", "filter-none"]],
  [
    "flex-direction",
    ["flex-col", "flex-col-reverse", "flex-row", "flex-row-reverse"],
  ],
  ["flex-wrap", ["flex-nowrap", "flex-wrap", "flex-wrap-reverse"]],
  ["font-style", ["italic", "not-italic"]],
  ["list-style-position", ["list-inside", "list-outside"]],
  ["list-style-type", ["list-decimal", "list-disc", "list-none"]],
  [
    "object-fit",
    [
      "object-contain",
      "object-cover",
      "object-fill",
      "object-none",
      "object-scale-down",
    ],
  ],
  ["position", ["absolute", "fixed", "relative", "static", "sticky"]],
  ["shadow", ["shadow"]],
  ["text-wrap", ["text-balance", "text-nowrap", "text-pretty", "text-wrap"]],
  [
    "transform",
    ["transform", "transform-cpu", "transform-gpu", "transform-none"],
  ],
];

const KEYWORD_GROUPS: ReadonlyMap<string, SingleGroup> = new Map(
  NAMES_BY_GROUP.flatMap(([group, names]) =>
    names.map((name) => [name, group] as const)
  )
);

type KeywordGroup = "list-style-position" | "list-style-type" | "text-wrap";

export { KEYWORD_GROUPS };

export type { KeywordGroup };
