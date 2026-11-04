import type {
  File as BabelFile,
  ImportDeclaration,
  Node as BabelNode,
  ObjectPattern,
  TSType,
} from "@babel/types";

import { toEnd, toStart, toLineIndent, toUnit } from "./ast.js";
import { toInsertAfter } from "./splice.js";
import type { ComponentModel, Splice, TypeBody } from "./types.js";

const PAREN_TYPES = new Set([
  "TSConditionalType",
  "TSFunctionType",
  "TSUnionType",
]);

const toOpenClose = (code: string, pattern: ObjectPattern): Splice => {
  const start = toStart(pattern);
  const close = code.indexOf("}", start);

  const end = close + 1;
  const text = "";

  return { end, start, text };
};

const toEntrySplice = (model: ComponentModel, text: string): Splice => {
  const { code, pattern, rest } = model;
  const isMulti = code.slice(toStart(pattern), toEnd(pattern)).includes("\n");
  const last = pattern.properties.at(-1);

  if (!last) {
    const range = toOpenClose(code, pattern);

    return { ...range, text: `{ ${text} }` };
  }

  if (rest) {
    const indent = toLineIndent(code, toStart(rest));

    if (isMulti) {
      return {
        end: toStart(rest),
        start: toStart(rest),
        text: `${text},\n${indent}`,
      };
    }

    return { end: toStart(rest), start: toStart(rest), text: `${text}, ` };
  }

  if (isMulti) {
    const indent = toLineIndent(code, toStart(last));

    return toInsertAfter(code, toEnd(last), text, `\n${indent}`);
  }

  return toInsertAfter(code, toEnd(last), text, " ");
};

const toBodyList = (body: TypeBody): readonly BabelNode[] => {
  if (body.type === "TSTypeLiteral") {
    return body.members;
  }

  return body.body;
};

interface AfterLast {
  readonly isMulti: boolean;
  readonly last: BabelNode;
  readonly tail: string;
  readonly text: string;
}

const toAfterLast = (code: string, input: AfterLast): Splice => {
  const { isMulti, last, tail, text } = input;
  const end = toEnd(last);
  let delimiter = "";

  if (";,".includes(tail)) {
    delimiter = tail;
  }

  if (isMulti) {
    const indent = toLineIndent(code, toStart(last));
    const added = `\n${indent}${text}${delimiter || ";"}`;

    if (delimiter === "") {
      return { end, start: end, text: `;${added}` };
    }

    return { end, start: end, text: added };
  }

  if (delimiter === "") {
    return { end, start: end, text: `; ${text}` };
  }

  return { end, start: end, text: ` ${text}${delimiter}` };
};

const toBodyInsert = (code: string, body: TypeBody, text: string): Splice => {
  const list = toBodyList(body);
  const last = list.at(-1);

  if (!last) {
    const indent = toLineIndent(code, toStart(body));

    return {
      end: toEnd(body),
      start: toStart(body),
      text: `{\n${indent}${toUnit(code)}${text};\n${indent}}`,
    };
  }

  const tail = code.slice(toStart(last), toEnd(last)).at(-1) ?? "";
  const isMulti = code.slice(toStart(body), toEnd(body)).includes("\n");

  return toAfterLast(code, { isMulti, last, tail, text });
};

const toWrapText = (code: string, node: TSType, text: string): string => {
  const source = code.slice(toStart(node), toEnd(node));

  if (PAREN_TYPES.has(node.type)) {
    return `(${source}) & { ${text} }`;
  }

  return `${source} & { ${text} }`;
};

const toTypeSplice = (model: ComponentModel, text: string): Splice | null => {
  const { code, host } = model;

  if (!model.isTyped) {
    return null;
  }

  if (host.insertInto) {
    return toBodyInsert(code, host.insertInto, text);
  }

  if (host.wrap) {
    return {
      end: toEnd(host.wrap),
      start: toStart(host.wrap),
      text: toWrapText(code, host.wrap, text),
    };
  }

  if (host.annotationAt !== null) {
    return {
      end: host.annotationAt,
      start: host.annotationAt,
      text: `: { ${text} }`,
    };
  }

  return null;
};

const toSpecifierName = (
  specifier: ImportDeclaration["specifiers"][number]
): string | null => {
  if (specifier.type !== "ImportSpecifier") {
    return `${specifier.local.name}.ReactNode`;
  }

  if (specifier.local.name === "ReactNode") {
    return "ReactNode";
  }

  return null;
};

const toReactNodeName = (ast: BabelFile): string | null => {
  const imports = ast.program.body.filter(
    (statement): statement is ImportDeclaration =>
      statement.type === "ImportDeclaration" &&
      statement.source.value === "react"
  );

  const names = imports.flatMap((statement) =>
    statement.specifiers.flatMap(
      (specifier) => toSpecifierName(specifier) ?? []
    )
  );

  return names[0] ?? null;
};

const toReactNodeImport = (ast: BabelFile): Splice => {
  const imports = ast.program.body.filter(
    (statement) => statement.type === "ImportDeclaration"
  );

  const last = imports.at(-1);
  const text = 'import type { ReactNode } from "react";';

  if (last) {
    return { end: toEnd(last), start: toEnd(last), text: `\n${text}` };
  }

  const directive = ast.program.directives.at(-1);

  if (directive) {
    return {
      end: toEnd(directive),
      start: toEnd(directive),
      text: `\n\n${text}`,
    };
  }

  return { end: 0, start: 0, text: `${text}\n\n` };
};

export { toEntrySplice, toReactNodeImport, toReactNodeName, toTypeSplice };
