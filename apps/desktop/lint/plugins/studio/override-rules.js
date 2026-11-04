import { keyName, propertyOf, rule } from "./ast.js";

const STYLE_RULES = new Set([
  "anti-slop/require-readable-spacing",
  "arrow-body-style",
  "curly",
  "explicit-function-return-type",
  "func-style",
  "github/no-then",
  "max-params",
  "method-signature-style",
  "no-unused-vars",
  "no-useless-return",
  "prefer-destructuring",
  "promise/prefer-await-to-then",
  "require-unicode-regexp",
  "sonarjs/no-dead-store",
  "sonarjs/no-unused-vars",
  "typescript/consistent-type-definitions",
  "typescript/explicit-function-return-type",
  "typescript/method-signature-style",
  "unicorn/consistent-function-scoping",
  "unicorn/no-useless-spread",
  "unicorn/prefer-spread",
]);

const STYLE_MESSAGE =
  "Turning a fixable style rule (curly, func-style, prefer-destructuring, no-unused-vars, no-dead-store, return types, method-signature-style, prefer-spread, no-then, readable spacing) off in a decision override is banned (L6). Use a code fix in the file: braces, arrow consts, destructuring, a deleted dead store, a return type. Keep in lint/decisions.ts only a rule that the spec forces.";

const SPLIT_MESSAGE =
  "A second decision override for the same files is banned. Use one override object per file set in lint/decisions.ts, with all the rules for those files in it.";

const ruleKey = (property) => (keyName(property) ?? "").replace(/^eslint\//u, "");

const levelOf = (property) => {
  if (property.value.type === "Literal") {
    return property.value.value;
  }

  if (property.value.type === "ArrayExpression") {
    return property.value.elements[0]?.value ?? null;
  }

  return null;
};

const isStyleOff = (property) =>
  property.type === "Property" &&
  STYLE_RULES.has(ruleKey(property)) &&
  levelOf(property) === "off";

const overrideParts = (node) => {
  const files = propertyOf(node, "files");
  const rules = propertyOf(node, "rules");

  if (files === null || rules === null || rules.value.type !== "ObjectExpression") {
    return null;
  }

  return { files: files.value, rules: rules.value };
};

const noStyleOff = rule((context) => ({
  ObjectExpression: (node) => {
    const parts = overrideParts(node);

    if (parts === null) {
      return;
    }

    for (const property of parts.rules.properties.filter(isStyleOff)) {
      context.report({ message: STYLE_MESSAGE, node: property });
    }
  },
}));

const filesKey = (files) => {
  if (files.type !== "ArrayExpression") {
    return null;
  }

  const values = files.elements.map((element) => {
    if (element?.type === "Literal") {
      return String(element.value);
    }

    return null;
  });

  if (values.includes(null)) {
    return null;
  }

  return values.toSorted().join("\n");
};

const isOverrideList = (array) =>
  array.parent?.type === "VariableDeclarator" &&
  array.parent.id.type === "Identifier" &&
  array.parent.id.name === "decisionOverrides";

const keyOfElement = (element) => {
  if (element?.type !== "ObjectExpression") {
    return null;
  }

  const parts = overrideParts(element);

  if (parts === null) {
    return null;
  }

  return filesKey(parts.files);
};

const checkSplit = (context, array) => {
  const seen = new Set();

  for (const element of array.elements) {
    const key = keyOfElement(element);

    if (key !== null && seen.has(key)) {
      context.report({ message: SPLIT_MESSAGE, node: element });
    }

    if (key !== null) {
      seen.add(key);
    }
  }
};

const oneOverridePerFiles = rule((context) => ({
  ArrayExpression: (node) => {
    if (isOverrideList(node)) {
      checkSplit(context, node);
    }
  },
}));

export { noStyleOff, oneOverridePerFiles };
