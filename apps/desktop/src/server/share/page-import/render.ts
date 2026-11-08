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

const toEscapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const toEscapeAttr = (value: string): string =>
  toEscapeText(value).replaceAll('"', "&quot;");

const toOpenTag = (name: string, attrs: readonly string[]): string =>
  ["<", [name, ...attrs].join(" "), ">"].join("");

const toCloseTag = (name: string): string => ["</", name, ">"].join("");

const toElement = (
  name: string,
  attrs: readonly string[],
  inner: string
): string => [toOpenTag(name, attrs), inner, toCloseTag(name)].join("");

const toAttr = (name: string, value: string): string =>
  [name, '="', toEscapeAttr(value), '"'].join("");

const toLocalize = (
  value: string,
  local: ReadonlyMap<string, string>
): string => {
  let next = value;

  for (const href of cssUrls(value)) {
    next = next.replaceAll(href, local.get(href) ?? "");
  }

  return next;
};

const toAttrOf = (
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
    return [toAttr(name, value)];
  }

  const file = local.get(value);

  if (!file) {
    return [];
  }

  return [toAttr("src", file)];
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

const toRenderNode = (node: CapturedNode, input: RenderInput): string => {
  if (isDropped(node)) {
    return "";
  }

  const attrs = node.attrs.flatMap(([name, value]) =>
    toAttrOf(name, value, input.local)
  );

  const name = input.sheet.classOf.get(node);

  if (name) {
    attrs.unshift(toAttr("class", name));
  }

  if (VOID_TAGS.has(node.tag) && !node.svg) {
    return toOpenTag(node.tag, attrs);
  }

  const inner = node.children.map((child) => {
    if (isElement(child)) {
      return toRenderNode(child, input);
    }

    return toEscapeText(child);
  });

  return toElement(node.tag, attrs, inner.join(""));
};

const toFaceCss = (
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
      out.push(toLocalize(face.css, local).replaceAll(STYLE_TAG, ""));
    }
  }

  return out;
};

const toSheetText = (input: RenderInput): string => {
  const rules = input.sheet.rules.map((rule) => toLocalize(rule, input.local));

  const faces = toFaceCss(
    input.page.fontFaces,
    input.page.families,
    input.local
  );

  const reset = "*,*::before,*::after{box-sizing:border-box}";
  const body = "body{margin:0}";

  return [...faces, reset, body, ...rules].join("\n");
};

const toBodyMarkup = (input: RenderInput): string => {
  const inner = toRenderNode(input.root, input);

  if (input.isRegion) {
    return toElement("body", [], inner);
  }

  return inner;
};

const toRenderPage = (input: RenderInput): string => {
  const lang = input.page.lang || "en";
  const title = input.page.title || "Imported page";

  const head = [
    toOpenTag("meta", [toAttr("charset", "utf-8")]),
    toOpenTag("meta", [
      toAttr("name", "viewport"),
      toAttr("content", "width=device-width, initial-scale=1"),
    ]),
    toOpenTag("meta", [
      toAttr("name", "studio-import-source"),
      toAttr("content", input.sourceUrl),
    ]),
    toElement("title", [], toEscapeText(title)),
    toElement("style", [], ["", toSheetText(input), ""].join("\n")),
  ];

  return [
    "<!doctype html>",
    toOpenTag("html", [toAttr("lang", lang)]),
    toElement("head", [], ["", ...head, ""].join("\n")),
    toBodyMarkup(input),
    toCloseTag("html"),
    "",
  ].join("\n");
};

export { toRenderPage as renderPage };

export type { RenderInput };
