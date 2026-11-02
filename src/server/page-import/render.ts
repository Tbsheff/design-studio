import { cssUrls, isTrackerUrl } from "./assets.js";
import type { CapturedFace, CapturedNode, CapturedPage } from "./captured.js";
import { isElement } from "./nodes.js";
import type { ClassSheet } from "./styles.js";

const VOID_TAGS = new Set(["area", "br", "col", "hr", "img", "input", "wbr"]);

const TAG_NAME = /^[A-Za-z][A-Za-z0-9-]*$/u;

const ATTR_NAME = /^[A-Za-z_:][A-Za-z0-9_:.-]*$/u;

const UNSAFE_URL = /^\s*(?:javascript|vbscript|data:text\/html)/iu;

const STYLE_TAG = /<\/?style/giu;

interface RenderInput {
  readonly page: CapturedPage;
  readonly root: CapturedNode;
  readonly sheet: ClassSheet;
  readonly local: ReadonlyMap<string, string>;
  readonly sourceUrl: string;
  readonly isRegion: boolean;
}

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeAttr = (value: string): string =>
  escapeText(value).replaceAll('"', "&quot;");

const openTag = (name: string, attrs: readonly string[]): string =>
  ["<", [name, ...attrs].join(" "), ">"].join("");

const closeTag = (name: string): string => ["</", name, ">"].join("");

const element = (
  name: string,
  attrs: readonly string[],
  inner: string
): string => [openTag(name, attrs), inner, closeTag(name)].join("");

const attr = (name: string, value: string): string =>
  [name, '="', escapeAttr(value), '"'].join("");

const localize = (
  value: string,
  local: ReadonlyMap<string, string>
): string => {
  let next = value;

  for (const href of cssUrls(value)) {
    next = next.replaceAll(href, local.get(href) ?? "");
  }

  return next;
};

const attrOf = (
  name: string,
  value: string,
  local: ReadonlyMap<string, string>
): string[] => {
  const lower = name.toLowerCase();

  if (
    !ATTR_NAME.test(name) ||
    lower.startsWith("on") ||
    UNSAFE_URL.test(value)
  ) {
    return [];
  }

  if (lower !== "src") {
    return [attr(name, value)];
  }

  const file = local.get(value);

  if (!file) {
    return [];
  }

  return [attr("src", file)];
};

const isDropped = (node: CapturedNode): boolean => {
  if (!TAG_NAME.test(node.tag)) {
    return true;
  }

  if (node.tag !== "img") {
    return false;
  }

  const src = node.attrs.find(([name]) => name === "src")?.[1] ?? "";

  return isTrackerUrl(src);
};

const renderNode = (node: CapturedNode, input: RenderInput): string => {
  if (isDropped(node)) {
    return "";
  }

  const attrs = node.attrs.flatMap(([name, value]) =>
    attrOf(name, value, input.local)
  );

  const name = input.sheet.classOf.get(node);

  if (name) {
    attrs.unshift(attr("class", name));
  }

  if (VOID_TAGS.has(node.tag) && !node.svg) {
    return openTag(node.tag, attrs);
  }

  const inner = node.children.map((child) => {
    if (isElement(child)) {
      return renderNode(child, input);
    }

    return escapeText(child);
  });

  return element(node.tag, attrs, inner.join(""));
};

const faceCss = (
  faces: readonly CapturedFace[],
  families: readonly string[],
  local: ReadonlyMap<string, string>
): string[] => {
  const used = families.join(",").toLowerCase();
  const out: string[] = [];

  for (const face of faces) {
    const isUsed =
      face.family !== "" && used.includes(face.family.toLowerCase());

    const isLocal = cssUrls(face.css).some((href) => local.has(href));

    if (isUsed && isLocal) {
      out.push(localize(face.css, local).replaceAll(STYLE_TAG, ""));
    }
  }

  return out;
};

const sheetText = (input: RenderInput): string => {
  const rules = input.sheet.rules.map((rule) => localize(rule, input.local));
  const faces = faceCss(input.page.fontFaces, input.page.families, input.local);
  const reset = "*,*::before,*::after{box-sizing:border-box}";
  const body = "body{margin:0}";

  return [...faces, reset, body, ...rules].join("\n");
};

const bodyMarkup = (input: RenderInput): string => {
  const inner = renderNode(input.root, input);

  if (input.isRegion) {
    return element("body", [], inner);
  }

  return inner;
};

const renderPage = (input: RenderInput): string => {
  const lang = input.page.lang || "en";
  const title = input.page.title || "Imported page";

  const head = [
    openTag("meta", [attr("charset", "utf-8")]),
    openTag("meta", [
      attr("name", "viewport"),
      attr("content", "width=device-width, initial-scale=1"),
    ]),
    openTag("meta", [
      attr("name", "studio-import-source"),
      attr("content", input.sourceUrl),
    ]),
    element("title", [], escapeText(title)),
    element("style", [], ["", sheetText(input), ""].join("\n")),
  ];

  return [
    "<!doctype html>",
    openTag("html", [attr("lang", lang)]),
    element("head", [], ["", ...head, ""].join("\n")),
    bodyMarkup(input),
    closeTag("html"),
    "",
  ].join("\n");
};

export { renderPage };

export type { RenderInput };
