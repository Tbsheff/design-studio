import { decodeEntities } from "@design-studio/contracts/html-entities";

import { parseSource, setHtmlAttrs, setJsxAttrs } from "./deps.js";
import type { AttrChanges, Project } from "./deps.js";
import { SHEET_NAME } from "./photo-art-colors.js";
import type { PhotoPage } from "./photo-pick.js";
import {
  ART_ATTR,
  PHOTO_ATTR,
  isHtmlPage,
  toOrientation,
  toPhotoSlots,
} from "./photo-slots.js";
import type { PhotoSlot } from "./photo-slots.js";
import { toLabelFree, toLabelText } from "./photo-tag.js";

type BabelProgram = ReturnType<typeof parseSource>["program"];

type BabelStatement = BabelProgram["body"][number];

type BabelExpression = Extract<
  BabelStatement,
  { readonly type: "ExpressionStatement" }
>["expression"];

type JSXElement = Extract<BabelExpression, { readonly type: "JSXElement" }>;

type CallNode = Extract<BabelExpression, { readonly type: "CallExpression" }>;

type JSXAttribute = Extract<
  JSXElement["openingElement"]["attributes"][number],
  { readonly type: "JSXAttribute" }
>;

interface BabelNode {
  readonly type: string;
}

interface SlotPosition {
  readonly col: number;
  readonly line: number;
}

interface MarkedElement {
  readonly element: JSXElement;
  readonly isMapped: boolean;
}

const JSX_PAGE = /\.[jt]sx$/iu;

const SPACES = /\s+/gu;

const LABEL_MAX = 120;

const MAP_NAMES = new Set(["flatMap", "map"]);

const SKIPPED_KEYS = new Set([
  "innerComments",
  "leadingComments",
  "loc",
  "trailingComments",
]);

const SHEET_IMPORT = `import "./${SHEET_NAME}";`;

const isJsxPage = (relative: string): boolean => JSX_PAGE.test(relative);

const isTypescript = (relative: string): boolean => /\.tsx$/iu.test(relative);

const isArtPage = (project: Project, relative: string): boolean =>
  isHtmlPage(relative) || (isJsxPage(relative) && !project.app);

const isBabelNode = (value: unknown): value is BabelNode =>
  value instanceof Object && "type" in value;

const isJsxElement = (node: BabelNode): node is JSXElement =>
  node.type === "JSXElement";

const isCallNode = (node: BabelNode): node is CallNode =>
  node.type === "CallExpression";

const toChildNodes = (node: BabelNode): readonly BabelNode[] =>
  Object.entries(node).flatMap(([key, value]: [string, unknown]) => {
    if (SKIPPED_KEYS.has(key)) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter((item) => isBabelNode(item));
    }

    if (isBabelNode(value)) {
      return [value];
    }

    return [];
  });

const isMapCall = (node: BabelNode): boolean => {
  if (!isCallNode(node)) {
    return false;
  }

  const { callee } = node;

  if (
    (callee.type !== "MemberExpression" &&
      callee.type !== "OptionalMemberExpression") ||
    callee.property.type !== "Identifier"
  ) {
    return false;
  }

  return (
    MAP_NAMES.has(callee.property.name) ||
    (callee.property.name === "from" &&
      callee.object.type === "Identifier" &&
      callee.object.name === "Array")
  );
};

const toMarkedElements = (
  node: BabelNode,
  isMapped: boolean
): readonly MarkedElement[] => {
  const own: MarkedElement[] = [];

  if (isJsxElement(node)) {
    own.push({ element: node, isMapped });
  }

  const isInner = isMapped || isMapCall(node);

  return [
    ...own,
    ...toChildNodes(node).flatMap((child) => toMarkedElements(child, isInner)),
  ];
};

const toAttribute = (
  element: JSXElement,
  name: string
): JSXAttribute | null => {
  for (const attribute of element.openingElement.attributes) {
    if (
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === name
    ) {
      return attribute;
    }
  }

  return null;
};

const toLiteral = (attribute: JSXAttribute | null): string | null => {
  const value = attribute?.value ?? null;

  if (value === null) {
    return null;
  }

  if (value.type === "StringLiteral") {
    return value.value;
  }

  if (value.type !== "JSXExpressionContainer") {
    return null;
  }

  const { expression } = value;

  if (
    expression.type === "StringLiteral" ||
    expression.type === "NumericLiteral"
  ) {
    return String(expression.value);
  }

  return null;
};

const toTagName = (element: JSXElement): string => {
  const { name } = element.openingElement;

  if (name.type === "JSXIdentifier") {
    return name.name;
  }

  return "";
};

const hasStyleImage = (source: string, element: JSXElement): boolean => {
  const style = toAttribute(element, "style");

  if (style === null) {
    return false;
  }

  return source.slice(style.start ?? 0, style.end ?? 0).includes("url(");
};

const toJsxSlot = (source: string, element: JSXElement): PhotoSlot | null => {
  const words = toLiteral(toAttribute(element, PHOTO_ATTR));
  const start = element.openingElement.loc?.start ?? null;

  const cleaned = decodeEntities(words ?? "")
    .replaceAll(SPACES, " ")
    .trim();

  if (cleaned === "" || start === null) {
    return null;
  }

  const width = toLiteral(toAttribute(element, "width")) ?? "";
  const height = toLiteral(toAttribute(element, "height")) ?? "";

  return {
    alt: toLiteral(toAttribute(element, "alt")),
    col: start.column + 1,
    hasArt: toAttribute(element, ART_ATTR) !== null,
    hasImage:
      toAttribute(element, "src") !== null || hasStyleImage(source, element),
    isImg: toTagName(element) === "img",
    line: start.line,
    orientation: toOrientation(` width="${width}" height="${height}"`),
    query: cleaned,
    style: null,
  };
};

const toParsedRoot = (
  source: string,
  relative: string
): BabelProgram | null => {
  try {
    return parseSource(source, isTypescript(relative)).program;
  } catch {
    return null;
  }
};

const toJsxSlots = (source: string, relative: string): readonly PhotoSlot[] => {
  const root = toParsedRoot(source, relative);

  if (root === null) {
    return [];
  }

  return toMarkedElements(root, false).flatMap((marked) => {
    const slot = toJsxSlot(source, marked.element);

    if (marked.isMapped || slot === null) {
      return [];
    }

    return [slot];
  });
};

const toPageSlots = (page: PhotoPage): readonly PhotoSlot[] => {
  if (isJsxPage(page.relative)) {
    return toJsxSlots(page.source, page.relative);
  }

  return toPhotoSlots(page.source);
};

const toElementAt = (
  code: string,
  relative: string,
  position: SlotPosition
): JSXElement | null => {
  const root = toParsedRoot(code, relative);

  if (root === null) {
    return null;
  }

  const found = toMarkedElements(root, false).find((marked) => {
    const start = marked.element.openingElement.loc?.start ?? null;

    return start?.line === position.line && start.column + 1 === position.col;
  });

  return found?.element ?? null;
};

const toLabelRange = (
  element: JSXElement | null
): { readonly end: number; readonly start: number } | null => {
  const children = element?.children ?? [];

  const texts = children.flatMap((child) => {
    if (child.type !== "JSXText") {
      return [];
    }

    return [child];
  });

  if (
    texts.length === 0 ||
    texts.length !== children.length ||
    texts.every((child) => child.value.trim() === "")
  ) {
    return null;
  }

  return { end: texts.at(-1)?.end ?? 0, start: texts[0]?.start ?? 0 };
};

const toSlotLabel = (
  relative: string,
  code: string,
  position: SlotPosition
): string | null => {
  if (!isJsxPage(relative)) {
    return toLabelText(code, position);
  }

  const range = toLabelRange(toElementAt(code, relative, position));

  if (range === null) {
    return null;
  }

  const text = decodeEntities(code.slice(range.start, range.end))
    .replaceAll(SPACES, " ")
    .trim();

  return text.slice(0, LABEL_MAX);
};

const toSlotLabelFree = (
  relative: string,
  code: string,
  position: SlotPosition
): string => {
  if (!isJsxPage(relative)) {
    return toLabelFree(code, position);
  }

  const range = toLabelRange(toElementAt(code, relative, position));

  if (range === null) {
    return code;
  }

  return `${code.slice(0, range.start)}${code.slice(range.end)}`;
};

const toSlotAttrs = (
  relative: string,
  code: string,
  position: SlotPosition,
  changes: AttrChanges
): string => {
  if (isJsxPage(relative)) {
    return setJsxAttrs(code, position, isTypescript(relative), changes);
  }

  return setHtmlAttrs(code, position, changes);
};

const toImportEnd = (root: BabelProgram | null): number | null => {
  const imports = (root?.body ?? []).filter(
    (node) => node.type === "ImportDeclaration"
  );

  return imports.at(-1)?.end ?? null;
};

const toSheetImported = (code: string, relative: string): string => {
  if (code.includes(`./${SHEET_NAME}`)) {
    return code;
  }

  const end = toImportEnd(toParsedRoot(code, relative));

  if (end === null) {
    return `${SHEET_IMPORT}\n\n${code}`;
  }

  return `${code.slice(0, end)}\n${SHEET_IMPORT}${code.slice(end)}`;
};

const toSheetImport = (
  root: BabelProgram | null
): { readonly end: number; readonly start: number } | null => {
  const found = (root?.body ?? []).find(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.specifiers.length === 0 &&
      node.source.value === `./${SHEET_NAME}`
  );

  const start = found?.start ?? null;
  const end = found?.end ?? null;

  if (start === null || end === null) {
    return null;
  }

  return { end, start };
};

const toSheetUnimported = (code: string, relative: string): string => {
  const range = toSheetImport(toParsedRoot(code, relative));

  if (range === null) {
    return code;
  }

  const after = code.slice(range.end).replace(/^[^\S\n]*\n/u, "");

  return `${code.slice(0, range.start)}${after}`;
};

export {
  isArtPage,
  isJsxPage,
  toPageSlots,
  toSheetImported,
  toSheetUnimported,
  toSlotAttrs,
  toSlotLabel,
  toSlotLabelFree,
};
