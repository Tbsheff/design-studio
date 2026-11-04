import type {
  Node as BabelNode,
  JSXElement,
  JSXExpressionContainer,
  JSXText,
} from "@babel/types";

import {
  toEnd,
  toStart,
  toLineIndent,
  toLiteral,
  toTagName,
  toUnit,
  runWalk,
} from "./ast.js";
import { toBodyBindings, toIdentifierNames } from "./component.js";
import {
  toEntrySplice,
  toReactNodeImport,
  toReactNodeName,
  toTypeSplice,
} from "./edits.js";
import { isBlankText } from "./sites.js";
import { toPlanned, toRefusal } from "./types.js";
import type { ComponentModel, Outcome, Refusal, Splice } from "./types.js";

type MakeKind = "boolean" | "instance" | "slot" | "text";

interface CreateRequest {
  readonly col: number;
  readonly kind: MakeKind;
  readonly line: number;
  readonly name: string;
}

interface CreatePlan {
  readonly default: string;
  readonly note: string | null;
  readonly splices: readonly Splice[];
  readonly type: string;
}

interface Layer {
  readonly element: JSXElement;
  readonly parent: BabelNode | null;
}

interface Spec {
  readonly defaultText: string;
  readonly entryText: string;
  readonly needsNode: boolean;
  readonly replace: readonly Splice[];
  readonly typeText: string;
}

const RESERVED = new Set([
  "className",
  "dangerouslySetInnerHTML",
  "key",
  "ref",
  "style",
]);

const WRAP_PARENTS = new Set(["JSXElement", "JSXFragment"]);

const ROOT_PARENTS = new Set(["ArrowFunctionExpression", "ReturnStatement"]);

const toFail = (message: string): Outcome<Spec> =>
  toRefusal("bad_request", message);

const getLayer = (
  model: ComponentModel,
  line: number,
  col: number
): Layer | null => {
  let found: Layer | null = null;

  runWalk(model.fn.body, model.fn, (node, parent) => {
    if (node.type === "JSXElement" && found === null) {
      const start = node.openingElement.loc?.start;

      if (start?.line === line && start.column + 1 === col) {
        found = { element: node, parent };
      }
    }

    return found === null;
  });

  return found;
};

const toContext = (parent: BabelNode | null): "child" | "root" | null => {
  if (parent && WRAP_PARENTS.has(parent.type)) {
    return "child";
  }

  if (parent && ROOT_PARENTS.has(parent.type)) {
    return "root";
  }

  return null;
};

const toCollapsed = (text: string): string =>
  text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");

const toTextChild = (
  element: JSXElement
): JSXText | JSXExpressionContainer | null => {
  const meaningful = element.children.filter((child) => !isBlankText(child));
  const [only] = meaningful;

  if (meaningful.length !== 1 || !only) {
    return null;
  }

  if (only.type === "JSXText") {
    return only;
  }

  if (
    only.type === "JSXExpressionContainer" &&
    only.expression.type === "StringLiteral"
  ) {
    return only;
  }

  return null;
};

interface TextRange {
  readonly end: number;
  readonly start: number;
  readonly value: string;
}

const toTextRange = (
  code: string,
  child: JSXExpressionContainer | JSXText
): TextRange => {
  const start = toStart(child);
  const end = toEnd(child);

  if (child.type === "JSXExpressionContainer") {
    const { expression } = child;

    if (expression.type === "StringLiteral") {
      return { end, start, value: expression.value };
    }

    return { end, start, value: "" };
  }

  const raw = code.slice(start, end);
  const lead = raw.length - raw.trimStart().length;
  const trail = raw.length - raw.trimEnd().length;

  return {
    end: end - trail,
    start: start + lead,
    value: toCollapsed(child.value),
  };
};

const toTextSpec = (
  model: ComponentModel,
  layer: Layer,
  name: string
): Outcome<Spec> => {
  const child = toTextChild(layer.element);

  if (!child) {
    return toFail(
      "The layer must hold one plain text and nothing else to become a text prop."
    );
  }

  const range = toTextRange(model.code, child);
  const defaultText = toLiteral(model.code, range.value);
  const replace = [{ end: range.end, start: range.start, text: `{${name}}` }];
  const entryText = `${name} = ${defaultText}`;
  const needsNode = false;
  const typeText = "string";

  return toPlanned({ defaultText, entryText, needsNode, replace, typeText });
};

const toElementReplace = (
  layer: Layer,
  replacement: string,
  inChild: string
): Splice => {
  const context = toContext(layer.parent);
  const { element } = layer;
  let text = replacement;

  if (context === "child") {
    text = inChild;
  }

  return { end: toEnd(element), start: toStart(element), text };
};

const toBooleanSpec = (
  model: ComponentModel,
  layer: Layer,
  name: string
): Outcome<Spec> => {
  const context = toContext(layer.parent);

  if (context === null) {
    return toFail(
      "A boolean prop wraps a layer that is a child of another layer, or the returned layer."
    );
  }

  const source = model.code.slice(toStart(layer.element), toEnd(layer.element));
  const indent = toLineIndent(model.code, toStart(layer.element));
  const unit = toUnit(model.code);
  const wrapped = source.replaceAll("\n", `\n${unit}`);

  let text = `{${name} && ${source}}`;

  if (source.includes("\n")) {
    text = `{${name} && (\n${indent}${unit}${wrapped}\n${indent})}`;
  }

  return toPlanned({
    defaultText: "true",
    entryText: `${name} = true`,
    needsNode: false,
    replace: [toElementReplace(layer, `${name} ? ${source} : null`, text)],
    typeText: "boolean",
  });
};

const isNamePosition = (node: BabelNode, parent: BabelNode | null): boolean => {
  if (parent?.type === "JSXAttribute") {
    return parent.name === node;
  }

  if (parent?.type === "MemberExpression") {
    return parent.property === node && !parent.computed;
  }

  return (
    parent?.type === "ObjectProperty" &&
    parent.key === node &&
    !parent.computed &&
    !parent.shorthand
  );
};

const toReferencedNames = (element: JSXElement): Set<string> => {
  const names = new Set<string>();

  runWalk(element, null, (node, parent) => {
    if (
      (node.type === "Identifier" || node.type === "JSXIdentifier") &&
      !isNamePosition(node, parent)
    ) {
      names.add(node.name);
    }

    return true;
  });

  return names;
};

const toLocalUse = (
  model: ComponentModel,
  element: JSXElement
): string | null => {
  const skip = { end: toEnd(element), start: toStart(element) };
  const bindings = toBodyBindings(model, skip);

  return (
    [...toReferencedNames(element)].find((name) => bindings.has(name)) ?? null
  );
};

const toSlotSpec = (
  model: ComponentModel,
  layer: Layer,
  name: string
): Outcome<Spec> => {
  const context = toContext(layer.parent);
  const local = toLocalUse(model, layer.element);

  if (context === null) {
    return toFail(
      "A slot replaces a layer that is a child of another layer, or the returned layer."
    );
  }

  if (local !== null) {
    return toFail(
      `The layer uses ${local}, which the component body declares. A slot default cannot read it.`
    );
  }

  const source = model.code.slice(toStart(layer.element), toEnd(layer.element));
  let defaultText = source;

  if (source.includes("\n")) {
    defaultText = `(${source})`;
  }

  return toPlanned({
    defaultText,
    entryText: `${name} = ${defaultText}`,
    needsNode: true,
    replace: [toElementReplace(layer, name, `{${name}}`)],
    typeText: "",
  });
};

const toCapital = (text: string): string =>
  `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;

const toAlias = (model: ComponentModel, name: string): string => {
  const taken = new Set(toIdentifierNames(model.ast.program));
  let alias = `${toCapital(name)}Component`;
  let index = 2;

  while (taken.has(alias)) {
    alias = `${toCapital(name)}Component${index}`;
    index += 1;
  }

  return alias;
};

const toInstanceSpec = (
  model: ComponentModel,
  layer: Layer,
  name: string
): Outcome<Spec> => {
  const { openingElement, closingElement } = layer.element;
  const tag = toTagName(openingElement.name);
  const head = tag.split(".")[0] ?? tag;

  if (!/^[A-Z]/u.test(head) || tag.includes(":")) {
    return toFail(
      "An instance prop needs a layer that is a component, such as <Icon />."
    );
  }

  if (toBodyBindings(model, null).has(head)) {
    return toFail(`${head} is declared inside the component body.`);
  }

  const alias = toAlias(model, name);

  const splices: Splice[] = [
    {
      end: toEnd(openingElement.name),
      start: toStart(openingElement.name),
      text: alias,
    },
  ];

  if (closingElement) {
    splices.push({
      end: toEnd(closingElement.name),
      start: toStart(closingElement.name),
      text: alias,
    });
  }

  return toPlanned({
    defaultText: tag,
    entryText: `${name}: ${alias} = ${tag}`,
    needsNode: false,
    replace: splices,
    typeText: `typeof ${tag}`,
  });
};

const toSpec = (
  model: ComponentModel,
  layer: Layer,
  request: CreateRequest
): Outcome<Spec> => {
  if (request.kind === "text") {
    return toTextSpec(model, layer, request.name);
  }

  if (request.kind === "boolean") {
    return toBooleanSpec(model, layer, request.name);
  }

  if (request.kind === "slot") {
    return toSlotSpec(model, layer, request.name);
  }

  return toInstanceSpec(model, layer, request.name);
};

const toNameRefusal = (
  model: ComponentModel,
  request: CreateRequest
): Refusal | null => {
  const { name } = request;

  if (RESERVED.has(name) || (name === "children" && request.kind !== "slot")) {
    return toRefusal(
      "bad_request",
      `"${name}" cannot be a ${request.kind} prop.`
    );
  }

  const known =
    model.entries.some((entry) => entry.name === name) ||
    model.host.members.some((member) => member.name === name);

  if (known || toBodyBindings(model, null).has(name)) {
    return toRefusal(
      "conflict",
      `${model.name} has the prop or the variable ${name} already.`
    );
  }

  return null;
};

const createLayerPlan = (
  model: ComponentModel,
  request: CreateRequest
): Outcome<CreatePlan> => {
  const refused = toNameRefusal(model, request);

  if (refused) {
    return refused;
  }

  const layer = getLayer(model, request.line, request.col);

  if (!layer) {
    return toRefusal(
      "not_found",
      `No layer starts at line ${request.line}, column ${request.col} inside ${model.name}.`
    );
  }

  const spec = toSpec(model, layer, request);

  if (!spec.ok) {
    return spec;
  }

  const nodeName = toReactNodeName(model.ast);
  let { typeText } = spec.value;

  if (spec.value.needsNode) {
    typeText = nodeName ?? "ReactNode";
  }

  const member = `${request.name}?: ${typeText}`;
  const typeSplice = toTypeSplice(model, member);

  const splices = [
    ...spec.value.replace,
    toEntrySplice(model, spec.value.entryText),
  ];

  if (typeSplice) {
    splices.push(typeSplice);
  }

  if (model.isTyped && spec.value.needsNode && nodeName === null) {
    splices.push(toReactNodeImport(model.ast));
  }

  const note = null;
  const type = typeText;

  return toPlanned({ default: spec.value.defaultText, note, splices, type });
};

export { createLayerPlan };

export type { CreatePlan, CreateRequest, MakeKind };
