import { rule } from "./ast.js";

const GLOBAL_OBJECTS = new Set(["globalThis", "window"]);

const FETCH_MESSAGE =
  "fetch in UI feature code is banned (U1), because the studio token header and the error shape live in the platform layer. Use call(action, input), getBlob or getRaw from src/ui/platform/http.ts.";

const INTERVAL_MESSAGE =
  "setInterval in UI feature code is banned (U12), because polling repeats work that an event already reports. Use the event from src/ui/platform/event-hub.ts or the live store, and refresh through action.invalidates.";

const isGlobalObject = (node) => node.type === "Identifier" && GLOBAL_OBJECTS.has(node.name);

const isGlobalMember = (callee, name) => {
  if (callee.type !== "MemberExpression" || callee.computed) {
    return false;
  }

  return isGlobalObject(callee.object) && callee.property.name === name;
};

const isGlobalCall = (callee, name) => {
  if (callee.type === "Identifier") {
    return callee.name === name;
  }

  return isGlobalMember(callee, name);
};

const noFeatureFetch = rule((context) => ({
  CallExpression: (node) => {
    if (isGlobalCall(node.callee, "fetch")) {
      context.report({ message: FETCH_MESSAGE, node });
    }
  },
}));

const noFeatureInterval = rule((context) => ({
  CallExpression: (node) => {
    if (isGlobalCall(node.callee, "setInterval")) {
      context.report({ message: INTERVAL_MESSAGE, node });
    }
  },
}));

export { noFeatureFetch, noFeatureInterval };
