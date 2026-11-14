const KEYWORDS = {
  "align-items": {
    baseline: "items-baseline",
    center: "items-center",
    end: "items-end",
    "flex-end": "items-end",
    "flex-start": "items-start",
    normal: "items-normal",
    start: "items-start",
    stretch: "items-stretch",
  },
  "align-self": {
    auto: "self-auto",
    baseline: "self-baseline",
    center: "self-center",
    end: "self-end",
    "flex-end": "self-end",
    "flex-start": "self-start",
    start: "self-start",
    stretch: "self-stretch",
  },
  "background-position": {
    "50% 50%": "bg-center",
    bottom: "bg-bottom",
    center: "bg-center",
    left: "bg-left",
    right: "bg-right",
    top: "bg-top",
  },
  "background-repeat": {
    "no-repeat": "bg-no-repeat",
    repeat: "bg-repeat",
    "repeat-x": "bg-repeat-x",
    "repeat-y": "bg-repeat-y",
  },
  "background-size": {
    auto: "bg-auto",
    contain: "bg-contain",
    cover: "bg-cover",
  },
  "border-style": {
    dashed: "border-dashed",
    dotted: "border-dotted",
    double: "border-double",
    hidden: "border-hidden",
    none: "border-none",
    solid: "border-solid",
  },
  display: {
    block: "block",
    contents: "contents",
    flex: "flex",
    "flow-root": "flow-root",
    grid: "grid",
    inline: "inline",
    "inline-block": "inline-block",
    "inline-flex": "inline-flex",
    "inline-grid": "inline-grid",
    "list-item": "list-item",
    none: "hidden",
    table: "table",
  },
  "flex-direction": {
    column: "flex-col",
    "column-reverse": "flex-col-reverse",
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
  },
  "flex-wrap": {
    nowrap: "flex-nowrap",
    wrap: "flex-wrap",
    "wrap-reverse": "flex-wrap-reverse",
  },
  "font-style": {
    italic: "italic",
    normal: "not-italic",
  },
  "justify-content": {
    center: "justify-center",
    end: "justify-end",
    "flex-end": "justify-end",
    "flex-start": "justify-start",
    normal: "justify-normal",
    "space-around": "justify-around",
    "space-between": "justify-between",
    "space-evenly": "justify-evenly",
    start: "justify-start",
    stretch: "justify-stretch",
  },
  "justify-items": {
    center: "justify-items-center",
    end: "justify-items-end",
    "flex-end": "justify-items-end",
    "flex-start": "justify-items-start",
    normal: "justify-items-normal",
    start: "justify-items-start",
    stretch: "justify-items-stretch",
  },
  "list-style-position": {
    inside: "list-inside",
    outside: "list-outside",
  },
  "list-style-type": {
    decimal: "list-decimal",
    disc: "list-disc",
    none: "list-none",
  },
  "object-fit": {
    contain: "object-contain",
    cover: "object-cover",
    fill: "object-fill",
    none: "object-none",
    "scale-down": "object-scale-down",
  },
  "object-position": {
    "50% 50%": "object-center",
    bottom: "object-bottom",
    center: "object-center",
    left: "object-left",
    right: "object-right",
    top: "object-top",
  },
  overflow: {
    auto: "overflow-auto",
    clip: "overflow-clip",
    hidden: "overflow-hidden",
    scroll: "overflow-scroll",
    visible: "overflow-visible",
  },
  position: {
    absolute: "absolute",
    fixed: "fixed",
    relative: "relative",
    static: "static",
    sticky: "sticky",
  },
  "text-align": {
    center: "text-center",
    end: "text-end",
    justify: "text-justify",
    left: "text-left",
    right: "text-right",
    start: "text-start",
  },
  "text-decoration-line": {
    "line-through": "line-through",
    none: "no-underline",
    overline: "overline",
    underline: "underline",
  },
  "text-transform": {
    capitalize: "capitalize",
    lowercase: "lowercase",
    none: "normal-case",
    uppercase: "uppercase",
  },
  "text-wrap": {
    balance: "text-balance",
    nowrap: "text-nowrap",
    pretty: "text-pretty",
    wrap: "text-wrap",
  },
} as const;

const KEYWORD_CLASSES: ReadonlyMap<
  string,
  ReadonlyMap<string, string>
> = new Map(
  Object.entries(KEYWORDS).map(([prop, values]) => [
    prop,
    new Map(Object.entries(values)),
  ])
);

const toKeywordClass = (prop: string, value: string): string | null =>
  KEYWORD_CLASSES.get(prop)?.get(value.trim().toLowerCase()) ?? null;

export { toKeywordClass };
