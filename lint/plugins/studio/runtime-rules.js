import { keyName, rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const RUNTIME_FILE = "apps/desktop/src/server/main/runtime.ts";

const RUN_FOLDERS = /^apps\/desktop\/src\/server\/(?:http|mcp|agent-tools|main)\//u;

const RUN_METHODS = new Set(["runCallback", "runFork", "runPromise", "runPromiseExit", "runSync"]);

const RUNTIME_MESSAGE =
  "ManagedRuntime.make outside apps/desktop/src/server/main/runtime.ts is banned (S2), because a second runtime builds its layers again. Use the one StudioRuntime from apps/desktop/src/server/main/runtime.ts, with the service layer in apps/desktop/src/server/handlers/<domain>/live.ts.";

const RUN_MESSAGE =
  "runPromise, runPromiseExit, runSync, runFork and runCallback outside apps/desktop/src/server/{http,mcp,agent-tools,main} are banned (S3). Use an Effect, and run it with the StudioRuntime from apps/desktop/src/server/main/runtime.ts in a main or adapter file.";

const SPAN_MESSAGE =
  'An Effect.fn span name that is not "<Class>.<method>" in a service implementation is banned (S8). Use Effect.fn("<Class>.<method>") with the class name and the property key, as new:service makes it.';

const isNamed = (node, name) => node?.type === "Identifier" && node.name === name;

const memberName = (node) => {
  if (node?.type !== "MemberExpression" || node.computed || node.property.type !== "Identifier") {
    return null;
  }

  return node.property.name;
};

const serverOneRuntime = rule((context) => {
  if (relativeOf(context.filename) === RUNTIME_FILE) {
    return {};
  }

  return {
    CallExpression: (node) => {
      if (isNamed(node.callee.object, "ManagedRuntime") && memberName(node.callee) === "make") {
        context.report({ message: RUNTIME_MESSAGE, node });
      }
    },
  };
});

const serverRunEntry = rule((context) => {
  if (RUN_FOLDERS.test(relativeOf(context.filename))) {
    return {};
  }

  return {
    CallExpression: (node) => {
      if (RUN_METHODS.has(memberName(node.callee))) {
        context.report({ message: RUN_MESSAGE, node });
      }
    },
  };
});

const classOfCall = (node) => {
  const { callee } = node;

  if (memberName(callee) !== "of" || callee.object.type !== "Identifier") {
    return null;
  }

  return callee.object.name;
};

const spanOf = (value) => {
  const isFnCall =
    value?.type === "CallExpression" &&
    value.callee.type === "CallExpression" &&
    isNamed(value.callee.callee.object, "Effect") &&
    memberName(value.callee.callee) === "fn";

  if (!isFnCall) {
    return null;
  }

  const [name] = value.callee.arguments;

  if (name?.type === "Literal" && name.value === String(name.value)) {
    return name;
  }

  return null;
};

const checkSpans = (context, className, objectNode) => {
  for (const property of objectNode.properties) {
    const span = spanOf(property.value);
    const key = keyName(property);

    if (span !== null && key !== null && span.value !== `${className}.${key}`) {
      context.report({ message: SPAN_MESSAGE, node: span });
    }
  }
};

const spanNameMatch = rule((context) => ({
  CallExpression: (node) => {
    const className = classOfCall(node);
    const [first] = node.arguments;

    if (className !== null && first?.type === "ObjectExpression") {
      checkSpans(context, className, first);
    }
  },
}));

export { serverOneRuntime, serverRunEntry, spanNameMatch };
