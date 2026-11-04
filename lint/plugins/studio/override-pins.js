import { propertyOf } from "./ast.js";
import { committedTextOf } from "./freeze-rules.js";

const DECISIONS = "lint/decisions.ts";

const COMPUTED_ENTRY = /files:\s*\[(?<files>[^\]]*)\],\s*rules:\s*Object\.fromEntries\(\s*"(?<names>[^"]*)"/gu;

const FILES_LIST = /files:\s*\[(?<files>[^\]]*)\]/gu;

const QUOTED = /"(?<value>[^"\n]+)"/gu;

const cache = { pins: null, uses: null };

const isObjectCall = (callee) =>
  callee.type === "MemberExpression" &&
  callee.object.type === "Identifier" &&
  callee.object.name === "Object" &&
  callee.property.name === "fromEntries";

const isFromEntries = (node) => node?.type === "CallExpression" && isObjectCall(node.callee);

const splitSourceOf = (node) => {
  if (node?.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
    return null;
  }

  if (node.callee.property.name === "split" && node.callee.object.type === "Literal") {
    return String(node.callee.object.value);
  }

  return splitSourceOf(node.callee.object);
};

const computedRulesOf = (rulesNode) => {
  if (!isFromEntries(rulesNode)) {
    return null;
  }

  const [entries = null] = rulesNode.arguments;
  const source = splitSourceOf(entries);

  if (source === null) {
    return { names: [] };
  }

  return { names: source.split(" ").filter(Boolean) };
};

const fileValuesOf = (filesNode) => {
  if (filesNode?.type !== "ArrayExpression") {
    return [];
  }

  const values = [];

  for (const element of filesNode.elements) {
    if (element?.type === "Literal") {
      values.push(String(element.value));
    }
  }

  return values;
};

const partsOf = (node) => {
  if (node?.type !== "ObjectExpression") {
    return null;
  }

  const files = propertyOf(node, "files");
  const rules = propertyOf(node, "rules");

  if (files === null || rules === null) {
    return null;
  }

  return { files: files.value, rules: rules.value };
};

const quotedOf = (text) => [...text.matchAll(QUOTED)].map((found) => found.groups.value);

const pairKey = (file, name) => `${file}\n${name}`;

const pinsOf = (text) => {
  const pins = new Set();

  for (const found of text.matchAll(COMPUTED_ENTRY)) {
    const names = found.groups.names.split(" ").filter(Boolean);

    for (const file of quotedOf(found.groups.files)) {
      for (const name of names) {
        pins.add(pairKey(file, name));
      }
    }
  }

  return pins;
};

const usesOf = (text) => {
  const uses = new Map();

  for (const found of text.matchAll(FILES_LIST)) {
    for (const file of quotedOf(found.groups.files)) {
      uses.set(file, (uses.get(file) ?? 0) + 1);
    }
  }

  return uses;
};

const loadPins = () => {
  if (cache.pins === null) {
    const text = committedTextOf(DECISIONS) ?? "";

    cache.pins = pinsOf(text);
    cache.uses = usesOf(text);
  }

  return cache;
};

const isPinned = (files, name) => {
  const { pins } = loadPins();
  const values = fileValuesOf(files);

  return values.length > 0 && values.every((file) => pins.has(pairKey(file, name)));
};

const committedUsesOf = (file) => loadPins().uses.get(file) ?? 0;

export { committedUsesOf, computedRulesOf, fileValuesOf, isPinned, partsOf };
