import type { ChildKind, RawAttribute, RawElement } from "./engine/index.js";
import type {
  Ts,
  TsJsxAttribute,
  TsJsxAttributeLike,
  TsJsxElement,
  TsJsxExpression,
  TsJsxSelfClosingElement,
  TsNode,
  TsSourceFile,
} from "./ts-type.js";

const SCANNED_TAGS: ReadonlySet<string> = new Set([
  "a",
  "button",
  "input",
  "label",
  "select",
  "table",
  "textarea",
]);

const PULSE_TAGS: ReadonlySet<string> = new Set(["div", "span"]);

const PULSE_TOKEN = "animate-pulse";

const NO_TAGS: ReadonlySet<string> = new Set();

const toStringText = (ts: Ts, node: TsNode): string | null => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
};

const toExpressionAttribute = (
  ts: Ts,
  source: TsSourceFile,
  node: TsJsxExpression
): Pick<RawAttribute, "kind" | "text"> => {
  const { expression } = node;

  if (!expression) {
    return { kind: "expression", text: "" };
  }

  const text = toStringText(ts, expression);

  if (text !== null) {
    return { kind: "string", text };
  }

  return { kind: "expression", text: expression.getText(source) };
};

const toAttributeValue = (
  ts: Ts,
  source: TsSourceFile,
  node: TsJsxAttribute
): Pick<RawAttribute, "kind" | "text"> => {
  const { initializer } = node;

  if (!initializer) {
    return { kind: "flag", text: "" };
  }

  if (ts.isStringLiteral(initializer)) {
    return { kind: "string", text: initializer.text };
  }

  if (ts.isJsxExpression(initializer)) {
    return toExpressionAttribute(ts, source, initializer);
  }

  return { kind: "expression", text: initializer.getText(source) };
};

const toAttribute = (
  ts: Ts,
  source: TsSourceFile,
  node: TsJsxAttributeLike
): RawAttribute => {
  const start = node.getStart(source);
  const end = node.getEnd();

  if (ts.isJsxSpreadAttribute(node)) {
    const spread = { kind: "spread", name: "...", text: "" } as const;

    return { end, start, ...spread };
  }

  const name = node.name.getText(source);
  const { kind, text } = toAttributeValue(ts, source, node);

  return { end, kind, name, start, text };
};

const toOpening = (
  ts: Ts,
  node: TsJsxElement | TsJsxSelfClosingElement
): TsJsxSelfClosingElement | TsJsxElement["openingElement"] => {
  if (ts.isJsxElement(node)) {
    return node.openingElement;
  }

  return node;
};

const toClosingName = (
  ts: Ts,
  node: TsJsxElement | TsJsxSelfClosingElement
): TsJsxElement["closingElement"]["tagName"] | null => {
  if (ts.isJsxElement(node)) {
    return node.closingElement.tagName;
  }

  return null;
};

interface ScanScope {
  readonly pulseTags: ReadonlySet<string>;
  readonly source: TsSourceFile;
  readonly tags: ReadonlySet<string>;
}

const toNodeKind = (ts: Ts, node: TsNode): ChildKind => {
  if (ts.isJsxText(node)) {
    if (node.text.trim() === "") {
      return "empty";
    }

    return "text";
  }

  if (ts.isJsxExpression(node)) {
    if (node.expression) {
      return "text";
    }

    return "empty";
  }

  return "elements";
};

const toChildKind = (
  ts: Ts,
  node: TsJsxElement | TsJsxSelfClosingElement
): ChildKind => {
  if (!ts.isJsxElement(node)) {
    return "empty";
  }

  const kinds = new Set(node.children.map((child) => toNodeKind(ts, child)));

  if (kinds.has("text")) {
    return "text";
  }

  if (kinds.has("elements")) {
    return "elements";
  }

  return "empty";
};

const isPulseBlock = (attributes: readonly RawAttribute[]): boolean =>
  attributes.some(
    (attribute) =>
      attribute.name === "className" &&
      attribute.kind === "string" &&
      attribute.text.split(/\s+/u).includes(PULSE_TOKEN)
  );

const isScannedTag = (
  scope: ScanScope,
  tag: string,
  attributes: readonly RawAttribute[]
): boolean =>
  scope.tags.has(tag) || (scope.pulseTags.has(tag) && isPulseBlock(attributes));

const toElement = (
  ts: Ts,
  scope: ScanScope,
  node: TsJsxElement | TsJsxSelfClosingElement
): RawElement | null => {
  const { source } = scope;
  const opening = toOpening(ts, node);
  const { tagName } = opening;

  if (!ts.isIdentifier(tagName)) {
    return null;
  }

  const attributes = opening.attributes.properties.map((attribute) =>
    toAttribute(ts, source, attribute)
  );

  if (!isScannedTag(scope, tagName.text, attributes)) {
    return null;
  }

  const elementStart = node.getStart(source);
  const place = source.getLineAndCharacterOfPosition(elementStart);
  const closing = toClosingName(ts, node);
  const childKind = toChildKind(ts, node);
  const closeNameEnd = closing?.getEnd() ?? null;
  const closeNameStart = closing?.getStart(source) ?? null;
  const column = place.character + 1;
  const elementEnd = node.getEnd();
  const line = place.line + 1;
  const nameEnd = tagName.getEnd();
  const nameStart = tagName.getStart(source);
  const tag = tagName.text;

  return {
    attributes,
    childKind,
    closeNameEnd,
    closeNameStart,
    column,
    elementEnd,
    elementStart,
    line,
    nameEnd,
    nameStart,
    tag,
  };
};

const listScopedElements = (
  ts: Ts,
  file: string,
  code: string,
  scan: Omit<ScanScope, "source">
): RawElement[] => {
  let kind = ts.ScriptKind.TSX;

  if (file.endsWith(".jsx")) {
    kind = ts.ScriptKind.JSX;
  }

  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    false,
    kind
  );

  const found: RawElement[] = [];

  const visit = (node: TsNode): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const element = toElement(ts, { ...scan, source }, node);

      if (element !== null) {
        found.push(element);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return found;
};

const listTaggedElements = (
  ts: Ts,
  file: string,
  code: string,
  tags: ReadonlySet<string>
): RawElement[] =>
  listScopedElements(ts, file, code, { pulseTags: NO_TAGS, tags });

const listRawElements = (ts: Ts, file: string, code: string): RawElement[] =>
  listScopedElements(ts, file, code, {
    pulseTags: PULSE_TAGS,
    tags: SCANNED_TAGS,
  });

export { listRawElements, listTaggedElements };
