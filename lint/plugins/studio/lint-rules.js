import { keyName, rule } from "./ast.js";

const OVERRIDE_MESSAGE =
  "Turning a studio/* rule off or down in a lint override is banned. Use a code fix, or change the rule scope in lint/studio.ts in the lint merge step.";

const noStudioOverride = rule((context) => ({
  Property: (node) => {
    const key = keyName(node);

    if (key !== null && key.startsWith("studio/")) {
      context.report({ message: OVERRIDE_MESSAGE, node });
    }
  },
}));

export { noStudioOverride };
