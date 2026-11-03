import { keyName, propertyOf, rule } from "./ast.js";
import { FROZEN_AREAS, FROZEN_EXEMPTIONS, LEGACY_OVERRIDES, SCOPE_EXEMPTIONS } from "./frozen.js";

const WARN_MAX = 3;

const FIXABLE = new Set([
  "anti-slop/no-shape-in-symbol-names",
  "max-lines-per-function",
  "no-magic-numbers",
  "no-ternary",
  "no-undefined",
  "sort-keys",
]);

const EXEMPTION_LIST = /^(?:[A-Z_]+_SERVICE_NAMES|LEGACY_[A-Z_]+|NO_READ_CHANGES|PROMISE_TASK_FILES)$/u;

const BUNDLE_MESSAGE =
  "A decision override that turns more than 3 rules to warn is banned. Use a code fix in the new file, and keep only the forced rules for exact files in lint/decisions.ts.";

const FIXABLE_MESSAGE =
  "Turning a fixable style rule (no-magic-numbers, no-shape-in-symbol-names, no-undefined, no-ternary, sort-keys, max-lines-per-function) off or to warn in a decision override is banned. Use a code fix: a named const, a better name, null, if/else, sorted keys, a split function.";

const GLOB_MESSAGE =
  "A glob in the files of a decision override is banned. Use the exact file paths that the forced reason covers in lint/decisions.ts.";

const EXEMPTION_MESSAGE =
  "A new entry in a lint exemption list is banned in a slice. Use a code fix (for example a service role from the N5 list), or ask the lint merge step to add it to lint/plugins/studio/frozen.js.";

const AREA_MESSAGE =
  "A new area in a boundaries layer is banned in a slice. Use an area that is in a layer, or ask the lint merge step to add it to lint/plugins/studio/frozen.js.";

const stringsOf = (node) => {
  if (node === null || node.type !== "ArrayExpression") {
    return [];
  }

  return node.elements.filter((element) => element?.type === "Literal");
};

const ruleKey = (property) => (keyName(property) ?? "").replace(/^eslint\//u, "");

const levelOf = (property) => {
  if (property.value.type !== "Literal") {
    return null;
  }

  return property.value.value;
};

const isLegacyEntry = (files) => {
  const [first = null] = stringsOf(files);

  return first !== null && LEGACY_OVERRIDES.has(first.value);
};

const checkRules = (context, rules) => {
  const properties = rules.properties.filter((property) => property.type === "Property");
  const warns = properties.filter((property) => levelOf(property) === "warn");

  if (warns.length > WARN_MAX) {
    context.report({ message: BUNDLE_MESSAGE, node: rules });
  }

  for (const property of properties) {
    if (FIXABLE.has(ruleKey(property)) && levelOf(property) !== "error") {
      context.report({ message: FIXABLE_MESSAGE, node: property });
    }
  }
};

const checkFiles = (context, files) => {
  for (const literal of stringsOf(files)) {
    if (String(literal.value).includes("*")) {
      context.report({ message: GLOB_MESSAGE, node: literal });
    }
  }
};

const narrowOverride = rule((context) => ({
  ObjectExpression: (node) => {
    const files = propertyOf(node, "files");
    const rules = propertyOf(node, "rules");

    if (files === null || rules === null || rules.value.type !== "ObjectExpression") {
      return;
    }

    if (isLegacyEntry(files.value)) {
      return;
    }

    checkRules(context, rules.value);
    checkFiles(context, files.value);
  },
}));

const checkFrozen = (context, node, frozen, message) => {
  for (const literal of stringsOf(node)) {
    if (!frozen.has(literal.value)) {
      context.report({ message, node: literal });
    }
  }
};

const CONSTANT = /^[A-Z][A-Z0-9_]*$/u;

const exemptLiterals = (node, lists) => {
  if (node === null || node.type !== "ArrayExpression") {
    return [];
  }

  return node.elements.flatMap((element) => {
    if (element?.type === "Literal") {
      return [element];
    }

    const name = element?.argument?.name ?? element?.name ?? null;

    if (name === null || !lists.has(name)) {
      return [];
    }

    return exemptLiterals(lists.get(name), lists);
  });
};

const checkExcluded = (context, node, lists) => {
  for (const literal of exemptLiterals(node.value, lists)) {
    if (!FROZEN_EXEMPTIONS.has(literal.value) && !SCOPE_EXEMPTIONS.has(literal.value)) {
      context.report({ message: EXEMPTION_MESSAGE, node: literal });
    }
  }
};

const frozenExemption = rule((context) => {
  const lists = new Map();

  return {
    Property: (node) => {
      if (keyName(node) === "areas") {
        checkFrozen(context, node.value, FROZEN_AREAS, AREA_MESSAGE);
      }

      if (keyName(node) === "excludeFiles") {
        checkExcluded(context, node, lists);
      }
    },
    VariableDeclarator: (node) => {
      if (node.id.type === "Identifier" && CONSTANT.test(node.id.name)) {
        lists.set(node.id.name, node.init);
      }

      if (node.id.type === "Identifier" && EXEMPTION_LIST.test(node.id.name)) {
        checkFrozen(context, node.init, FROZEN_EXEMPTIONS, EXEMPTION_MESSAGE);
      }
    },
  };
});

export { frozenExemption, narrowOverride };
