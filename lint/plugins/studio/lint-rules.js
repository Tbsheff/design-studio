import { keyName, propertyOf, rule } from "./ast.js";
import { computedRulesOf, isPinned } from "./override-pins.js";

const OVERRIDE_MESSAGE =
  "Turning a studio/* rule off or to warn in a lint override is banned, also inside a string list (L6a). Use a code fix, or change the rule scope in lint/studio.ts in the lint merge step.";

const FIXABLE = new Set([
  "anti-slop/no-runtime-typeof",
  "eslint/no-ternary",
  "no-ternary",
  "promise/avoid-new",
  "react-doctor/only-export-components",
  "react/jsx-props-no-spreading",
  "react/only-export-components",
  "unicorn/filename-case",
]);

const FIXABLE_MESSAGE =
  "Turning a fixable rule (no-ternary, avoid-new, no-runtime-typeof, filename-case, only-export-components, jsx-props-no-spreading) off in a decision override is banned (L6b). Use a code fix: if/else for a ternary, Effect.callback from effect for new Promise, a type guard for typeof, a kebab-case file name, a file split, explicit props.";

const isOff = (node) => node.value.type === "Literal" && node.value.value === "off";

const noFixableOff = rule((context) => ({
  Property: (node) => {
    const key = keyName(node);

    if (key !== null && FIXABLE.has(key) && isOff(node)) {
      context.report({ message: FIXABLE_MESSAGE, node });
    }
  },
}));

const isStudioName = (name) => name.startsWith("studio/");

const checkComputedStudio = (context, node) => {
  const files = propertyOf(node, "files");
  const rules = propertyOf(node, "rules");
  const computed = computedRulesOf(rules?.value ?? null);

  if (files === null || computed === null) {
    return;
  }

  const fresh = computed.names.filter((name) => isStudioName(name) && !isPinned(files.value, name));

  if (fresh.length > 0) {
    context.report({ message: OVERRIDE_MESSAGE, node: rules });
  }
};

const noStudioOverride = rule((context) => ({
  ObjectExpression: (node) => checkComputedStudio(context, node),
  Property: (node) => {
    const key = keyName(node);

    if (key !== null && isStudioName(key)) {
      context.report({ message: OVERRIDE_MESSAGE, node });
    }
  },
}));

export { noFixableOff, noStudioOverride };
