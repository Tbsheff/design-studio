import { keyName, rule } from "./ast.js";

const OVERRIDE_MESSAGE =
  "Turning a studio/* rule off or down in a lint override is banned. Use a code fix, or change the rule scope in lint/studio.ts in the lint merge step.";

const FIXABLE = new Set([
  "anti-slop/no-runtime-typeof",
  "eslint/no-ternary",
  "no-ternary",
  "promise/avoid-new",
]);

const FIXABLE_MESSAGE =
  "Turning a fixable rule (no-ternary, avoid-new, no-runtime-typeof) off in a decision override is banned. Use a code fix: if/else for a ternary, Effect.callback from effect for new Promise, a type guard for typeof.";

const isOff = (node) => node.value.type === "Literal" && node.value.value === "off";

const noFixableOff = rule((context) => ({
  Property: (node) => {
    const key = keyName(node);

    if (key !== null && FIXABLE.has(key) && isOff(node)) {
      context.report({ message: FIXABLE_MESSAGE, node });
    }
  },
}));

const noStudioOverride = rule((context) => ({
  Property: (node) => {
    const key = keyName(node);

    if (key !== null && key.startsWith("studio/")) {
      context.report({ message: OVERRIDE_MESSAGE, node });
    }
  },
}));

export { noFixableOff, noStudioOverride };
