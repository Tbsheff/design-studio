import {
  findJsxElement,
  fromGroupClass,
  jsxAncestors,
  parseSource,
} from "./deps.js";
import type {
  GroupAncestor,
  GroupClass,
  SourceLoc,
  StyleSite,
} from "./deps.js";

type JsxElement = NonNullable<ReturnType<typeof findJsxElement>>;

type JsxAttributeItem = JsxElement["openingElement"]["attributes"][number];

type JsxAttribute = Extract<JsxAttributeItem, { type: "JSXAttribute" }>;

const CLASS_TOKEN = /[^\s"'`{}()[\],+?:]+/gu;

const DATA_STATE_ATTR = "data-state";

const TS_FILE = /\.tsx$/iu;

const isNamedAttribute = (
  attribute: JsxAttributeItem,
  names: readonly string[]
): attribute is JsxAttribute =>
  attribute.type === "JSXAttribute" &&
  attribute.name.type === "JSXIdentifier" &&
  names.includes(attribute.name.name);

const toClassText = (code: string, element: JsxElement): string => {
  const attribute = element.openingElement.attributes.find((entry) =>
    isNamedAttribute(entry, ["className", "class"])
  );

  if (!attribute?.value) {
    return "";
  }

  return code.slice(attribute.value.start ?? 0, attribute.value.end ?? 0);
};

const toGroupName = (code: string, element: JsxElement): GroupClass | null => {
  for (const token of toClassText(code, element).match(CLASS_TOKEN) ?? []) {
    const hit = fromGroupClass(token);

    if (hit !== null) {
      return hit;
    }
  }

  return null;
};

const isComponentElement = (element: JsxElement): boolean => {
  const { name } = element.openingElement;

  if (name.type !== "JSXIdentifier") {
    return true;
  }

  return /^[A-Z]/u.test(name.name);
};

const hasDataStateOf = (element: JsxElement): boolean =>
  isComponentElement(element) ||
  element.openingElement.attributes.some((entry) =>
    isNamedAttribute(entry, [DATA_STATE_ATTR])
  );

const toAncestorGroup = (
  code: string,
  node: ReturnType<typeof jsxAncestors>[number]
): GroupAncestor | null => {
  if (node.type !== "JSXElement") {
    return null;
  }

  const group = toGroupName(code, node);

  if (group === null) {
    return null;
  }

  return { hasDataState: hasDataStateOf(node), name: group.name };
};

const toJsxGroupAncestor = (
  code: string,
  loc: SourceLoc,
  isTypescript: boolean
): GroupAncestor | null => {
  const root = parseSource(code, isTypescript).program;
  const element = findJsxElement(root, { col: loc.col, line: loc.line });

  if (element === null) {
    return null;
  }

  for (const node of jsxAncestors(root, element)) {
    const group = toAncestorGroup(code, node);

    if (group !== null) {
      return group;
    }
  }

  return null;
};

const toGroupAncestor = (
  site: StyleSite,
  loc: SourceLoc
): GroupAncestor | null => {
  if (site.html || site.theme === null) {
    return null;
  }

  return toJsxGroupAncestor(site.code, loc, TS_FILE.test(site.relative));
};

export { toGroupAncestor };
