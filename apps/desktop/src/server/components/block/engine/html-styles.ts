type Rule = readonly [name: string, css: string, media: string | null];

const EDGE = "color-mix(in srgb, currentColor 18%, transparent)";

const MUTED = "color-mix(in srgb, currentColor 62%, transparent)";

const SM = "(min-width: 640px)";

const LG = "(min-width: 1024px)";

const toColumns = (count: number): string =>
  `display:grid;grid-template-columns:repeat(${count},minmax(0,1fr))`;

const FOUR = 4;

const RULES: readonly Rule[] = [
  ["align-middle", "vertical-align:middle", null],
  ["bg-background", "background:transparent", null],
  [
    "bg-card",
    "background:color-mix(in srgb, currentColor 4%, transparent)",
    null,
  ],
  [
    "bg-muted",
    "background:color-mix(in srgb, currentColor 8%, transparent)",
    null,
  ],
  ["bg-transparent", "background:transparent", null],
  ["border", `border:1px solid ${EDGE}`, null],
  ["border-b", `border-bottom:1px solid ${EDGE}`, null],
  ["border-collapse", "border-collapse:collapse", null],
  ["border-dashed", "border-style:dashed", null],
  ["border-input", `border-color:${EDGE}`, null],
  ["caption-bottom", "caption-side:bottom", null],
  ["flex", "display:flex", null],
  ["flex-col", "flex-direction:column", null],
  ["flex-wrap", "flex-wrap:wrap", null],
  ["font-medium", "font-weight:500", null],
  ["font-semibold", "font-weight:600", null],
  ["gap-1", "gap:0.25rem", null],
  ["gap-1.5", "gap:0.375rem", null],
  ["gap-2", "gap:0.5rem", null],
  ["gap-3", "gap:0.75rem", null],
  ["gap-4", "gap:1rem", null],
  ["gap-6", "gap:1.5rem", null],
  ["grid", "display:grid", null],
  ["h-10", "height:2.5rem", null],
  ["h-9", "height:2.25rem", null],
  ["inline-flex", "display:inline-flex", null],
  ["items-center", "align-items:center", null],
  ["items-start", "align-items:flex-start", null],
  ["justify-between", "justify-content:space-between", null],
  ["justify-center", "justify-content:center", null],
  ["justify-end", "justify-content:flex-end", null],
  ["leading-none", "line-height:1", null],
  ["lg:grid-cols-4", toColumns(FOUR), LG],
  [
    "lg:grid-cols-[320px_1fr]",
    "display:grid;grid-template-columns:320px 1fr",
    LG,
  ],
  ["m-0", "margin:0", null],
  ["max-w-2xl", "max-width:42rem", null],
  ["max-w-3xl", "max-width:48rem", null],
  ["max-w-sm", "max-width:24rem", null],
  ["max-w-xs", "max-width:20rem", null],
  ["min-h-[60vh]", "min-height:60vh", null],
  ["p-1", "padding:0.25rem", null],
  ["p-3", "padding:0.75rem", null],
  ["p-6", "padding:1.5rem", null],
  ["pb-2", "padding-bottom:0.5rem", null],
  ["pb-4", "padding-bottom:1rem", null],
  ["pt-4", "padding-top:1rem", null],
  ["px-2", "padding-left:0.5rem;padding-right:0.5rem", null],
  ["px-3", "padding-left:0.75rem;padding-right:0.75rem", null],
  ["px-4", "padding-left:1rem;padding-right:1rem", null],
  ["px-6", "padding-left:1.5rem;padding-right:1.5rem", null],
  ["py-0.5", "padding-top:0.125rem;padding-bottom:0.125rem", null],
  ["py-1", "padding-top:0.25rem;padding-bottom:0.25rem", null],
  ["py-16", "padding-top:4rem;padding-bottom:4rem", null],
  ["py-6", "padding-top:1.5rem;padding-bottom:1.5rem", null],
  ["rounded-lg", "border-radius:0.5rem", null],
  ["rounded-md", "border-radius:0.375rem", null],
  ["rounded-xl", "border-radius:0.75rem", null],
  ["shadow-sm", "box-shadow:0 1px 2px rgba(0, 0, 0, 0.08)", null],
  ["sm:col-span-2", "grid-column:span 2 / span 2", SM],
  ["sm:grid-cols-2", toColumns(2), SM],
  ["text-2xl", "font-size:1.5rem;line-height:2rem", null],
  ["text-card-foreground", "color:inherit", null],
  ["text-center", "text-align:center", null],
  ["text-left", "text-align:left", null],
  ["text-lg", "font-size:1.125rem;line-height:1.75rem", null],
  ["text-muted-foreground", `color:${MUTED}`, null],
  ["text-sm", "font-size:0.875rem;line-height:1.25rem", null],
  ["text-xs", "font-size:0.75rem;line-height:1rem", null],
  ["w-full", "width:100%", null],
];

const CLASS_ATTR = /\sclass="(?<names>[^"]*)"/gu;

const OPEN = "<";

const END = "</";

const TAG = "style";

const BACKSLASH = "\\";

const toEscaped = (char: string): string => [BACKSLASH, char].join("");

const toEscapedName = (name: string): string =>
  name.replaceAll(/[^a-zA-Z0-9_-]/gu, (char) => toEscaped(char));

const toSelector = (name: string): string => `.${toEscapedName(name)}`;

const toRuleText = (rule: Rule): string => {
  const [name, css, media] = rule;
  const body = `${toSelector(name)}{${css}}`;

  if (media === null) {
    return body;
  }

  return `@media ${media}{${body}}`;
};

const toUsedNames = (markup: string): Set<string> => {
  const used = new Set<string>();

  for (const match of markup.matchAll(CLASS_ATTR)) {
    for (const name of (match.groups?.["names"] ?? "").split(/\s+/u)) {
      used.add(name);
    }
  }

  return used;
};

const toHtmlStyles = (markup: string, id: string): string => {
  const used = toUsedNames(markup);
  const lines: string[] = [];

  for (const rule of RULES) {
    if (used.has(rule[0])) {
      lines.push(toRuleText(rule));
    }
  }

  const open = `${OPEN}${TAG} data-studio-block="${id}">`;
  const close = `${END}${TAG}>`;

  return [open, ...lines, close].join("\n");
};

export { toHtmlStyles };
