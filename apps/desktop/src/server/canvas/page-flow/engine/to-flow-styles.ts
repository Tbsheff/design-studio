import type { HtmlElement } from "../../page-match/engine/to-element-spot.js";

const ROOT_RULE = /:root\s*\{(?<body>[^}]*)\}/gu;

const TOKEN_NAME = /^--[\w-]+$/u;

const SPACE = /\s+/gu;

const FONT_HOST = /fonts\.(?:googleapis|gstatic|bunny)\.|use\.typekit\./iu;

const toAttr = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((attr) => attr.name === name)?.value ?? null;

const toText = (element: HtmlElement): string =>
  element.childNodes
    .map((node) => {
      if ("value" in node && node.nodeName === "#text") {
        return node.value;
      }

      return "";
    })
    .join("");

const listRootPairs = (body: string): [string, string][] => {
  const pairs: [string, string][] = [];

  for (const line of body.split(";")) {
    const at = line.indexOf(":");
    const name = line.slice(0, Math.max(at, 0)).trim();

    if (TOKEN_NAME.test(name)) {
      pairs.push([
        name,
        line
          .slice(at + 1)
          .replaceAll(SPACE, " ")
          .trim(),
      ]);
    }
  }

  return pairs;
};

const toRootTokens = (
  all: readonly HtmlElement[]
): ReadonlyMap<string, string> => {
  const tokens = new Map<string, string>();

  for (const style of all.filter((element) => element.tagName === "style")) {
    for (const rule of toText(style).matchAll(ROOT_RULE)) {
      for (const [name, value] of listRootPairs(rule.groups?.["body"] ?? "")) {
        tokens.set(name, value);
      }
    }
  }

  return tokens;
};

const isSheetLink = (element: HtmlElement, href: string): boolean => {
  const rel = (toAttr(element, "rel") ?? "").toLowerCase().split(SPACE);

  return rel.includes("stylesheet") || FONT_HOST.test(href);
};

const toSheetLinks = (all: readonly HtmlElement[]): readonly string[] => {
  const found = new Set<string>();

  for (const element of all.filter((item) => item.tagName === "link")) {
    const href = (toAttr(element, "href") ?? "").trim();

    if (href !== "" && isSheetLink(element, href)) {
      found.add(href);
    }
  }

  return [...found];
};

export { toAttr, toRootTokens, toSheetLinks, toText };
