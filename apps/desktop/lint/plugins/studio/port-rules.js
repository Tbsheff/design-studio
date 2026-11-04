import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { lastName, rule } from "./ast.js";

const DECLARED_NAME =
  /^export (?:declare |default |abstract |async )*(?:const|let|var|function\*?|class|interface|type|enum|namespace) (?<name>[A-Za-z_$][\w$]*)/gmu;

const NAMED_BLOCK = /export\s+(?:type\s+)?\{(?<body>[^}]*)\}/gu;

const STAR_SOURCE = /export\s+\*\s+from\s+"(?<source>[^"]+)"/gu;

const STAR_NAME = /export\s+\*\s+as\s+(?<name>[A-Za-z_$][\w$]*)/gu;

const OBJECT_EXPORT = /export\s+const\s+\{(?<body>[^}]*)\}/gu;

const TYPE_PREFIX = /^type\s+/u;

const SOURCE_FILE = [".ts", ".tsx"];

const JS_TAIL = /\.js$/u;

const EXPORT_MESSAGE =
  "A named import that the target file does not export is banned (V5, W13), because the server fails to boot with a SyntaxError. Use the owner file, or add the name to the export block of the target index.ts.";

const UNBOUND_MESSAGE =
  "A name with no import and no declaration is banned (V5), because it throws a ReferenceError when the code runs (a removed import leaves the name in use). Use an import of the name, or build the field with toSdkFieldSet from src/server/agent-tools/index.ts.";

const SDK_MESSAGE =
  "A SdkFields annotation on a tool input is banned (V5), because it erases the field types and the tool args become unknown. Use the inferred return type of toSdkFieldSet from src/server/agent-tools/index.ts.";

const LOOSE_MESSAGE =
  "Schema.Unknown in tool or import code is banned (E3a). Use a typed Schema.Struct field, or Schema.Json from effect.";

const PARSE_CAST_MESSAGE =
  "A cast of JSON.parse output is banned (U18). Use a Schema decoder from src/server/platform/decode/index.ts.";

const VERB_MESSAGE =
  "A top-level field builder with a noun name is banned (N5d). Use a name that starts with to, from, is, has, can or should: toSelectorField, never selectorField.";

const WORD_MESSAGE =
  "A type name with a banned word (Data, Info, Item, Obj, Thing, Stuff, Manager, Helper, Util, Misc) is banned (N6). Use a domain word: ToolDecoded, never ToolData.";

const FIELD_BUILDER = /(?:Field|Fields|Schema|Input)$/u;

const VERB_START = /^(?:to|from|is|has|can|should)[A-Z]/u;

const BANNED_WORD = /(?:Data|Info|Item|Obj|Thing|Stuff|Manager|Helper|Util|Misc)(?:[A-Z]|$)/u;

const cache = new Map();

const addNames = (names, body) => {
  for (const part of body.split(",")) {
    const name = part.trim().replace(TYPE_PREFIX, "").split(" as ").at(-1).trim();

    if (name !== "") {
      names.add(name);
    }
  }
};

const toResolved = (from, source) => {
  const base = path.resolve(path.dirname(from), source).replace(JS_TAIL, "");

  return (
    [...SOURCE_FILE.map((tail) => `${base}${tail}`), ...SOURCE_FILE.map((tail) => path.join(base, `index${tail}`))].find(
      (candidate) => existsSync(candidate)
    ) ?? null
  );
};

const readExports = (file, names, seen) => {
  if (seen.has(file)) {
    return;
  }

  seen.add(file);
  const text = readFileSync(file, "utf-8");

  for (const match of text.matchAll(DECLARED_NAME)) {
    names.add(match.groups.name);
  }

  for (const pattern of [NAMED_BLOCK, OBJECT_EXPORT]) {
    for (const match of text.matchAll(pattern)) {
      addNames(names, match.groups.body);
    }
  }

  for (const match of text.matchAll(STAR_NAME)) {
    names.add(match.groups.name);
  }

  for (const match of text.matchAll(STAR_SOURCE)) {
    const target = toResolved(file, match.groups.source);

    if (target !== null) {
      readExports(target, names, seen);
    }
  }
};

const exportsOf = (file) => {
  if (!cache.has(file)) {
    const names = new Set();

    readExports(file, names, new Set());
    cache.set(file, names);
  }

  return cache.get(file);
};

const checkSpecifiers = (context, node, nameOf) => {
  const source = String(node.source?.value ?? "");

  if (!source.startsWith(".")) {
    return;
  }

  const target = toResolved(context.filename, source);

  if (target === null || target.endsWith(".d.ts")) {
    return;
  }

  const names = exportsOf(target);

  for (const specifier of node.specifiers) {
    const name = nameOf(specifier);

    if (name !== null && !names.has(name)) {
      context.report({ message: EXPORT_MESSAGE, node: specifier });
    }
  }
};

const importedName = (specifier) => {
  if (specifier.type !== "ImportSpecifier") {
    return null;
  }

  return specifier.imported.name ?? specifier.imported.value;
};

const localName = (specifier) => specifier.local.name ?? specifier.local.value;

const importNameExported = rule((context) => ({
  ExportNamedDeclaration: (node) => checkSpecifiers(context, node, localName),
  ImportDeclaration: (node) => checkSpecifiers(context, node, importedName),
}));

const isUnboundScope = (name) => !(name in globalThis);

const noUnboundName = rule((context) => ({
  "Program:exit": () => {
    const [root] = context.sourceCode.scopeManager.scopes;

    for (const reference of root.through) {
      const { name } = reference.identifier;

      if (!reference.isTypeReference && reference.isValueReference !== false && isUnboundScope(name)) {
        context.report({ message: UNBOUND_MESSAGE, node: reference.identifier });
      }
    }
  },
}));

const noErasedSdkFields = rule((context) => ({
  TSTypeReference: (node) => {
    if (lastName(node.typeName) === "SdkFields") {
      context.report({ message: SDK_MESSAGE, node });
    }
  },
}));

const noLooseToolType = rule((context) => ({
  MemberExpression: (node) => {
    if (node.object.type === "Identifier" && node.object.name === "Schema" && lastName(node) === "Unknown") {
      context.report({ message: LOOSE_MESSAGE, node });
    }
  },
  TSAsExpression: (node) => {
    const { expression } = node;

    if (
      expression.type === "CallExpression" &&
      expression.callee.type === "MemberExpression" &&
      lastName(expression.callee.object) === "JSON" &&
      lastName(expression.callee) === "parse"
    ) {
      context.report({ message: PARSE_CAST_MESSAGE, node });
    }
  },
}));

const isTopLevel = (node) =>
  node.parent?.type === "VariableDeclaration" && node.parent.parent?.type === "Program";

const isFunctionValue = (node) =>
  node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const fieldBuilderVerb = rule((context) => ({
  VariableDeclarator: (node) => {
    if (!isTopLevel(node) || node.id.type !== "Identifier" || !isFunctionValue(node.init)) {
      return;
    }

    if (FIELD_BUILDER.test(node.id.name) && !VERB_START.test(node.id.name)) {
      context.report({ message: VERB_MESSAGE, node: node.id });
    }
  },
}));

const checkTypeWord = (context, id) => {
  if (BANNED_WORD.test(id.name)) {
    context.report({ message: WORD_MESSAGE, node: id });
  }
};

const noBannedTypeWord = rule((context) => ({
  TSInterfaceDeclaration: (node) => checkTypeWord(context, node.id),
  TSTypeAliasDeclaration: (node) => checkTypeWord(context, node.id),
}));

const portRules = {
  "field-builder-verb": fieldBuilderVerb,
  "import-name-exported": importNameExported,
  "no-banned-type-word": noBannedTypeWord,
  "no-erased-sdk-fields": noErasedSdkFields,
  "no-loose-tool-type": noLooseToolType,
  "no-unbound-name": noUnboundName,
};

export { portRules };
