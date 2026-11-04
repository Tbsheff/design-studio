import { keyName, lastName, rule } from "./ast.js";

const STORAGE_NAMES = new Set(["localStorage", "sessionStorage"]);

const SETTER = /^set[A-Z]/u;

const FLAG_NAME = /^(?:is|has|can|should)[A-Z]/u;

const OPTIONAL_CALLS = new Set(["optional", "optionalKey"]);

const COPY_ATTRIBUTES = new Set(["alt", "aria-label", "data-tip", "placeholder", "title"]);

const HAS_LETTER = /\p{L}/u;

const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

const STORAGE_MESSAGE =
  "localStorage and sessionStorage outside apps/desktop/src/ui/platform are banned (U1). Use readStored and writeStored from apps/desktop/src/ui/platform/storage.ts.";

const FINALLY_MESSAGE =
  "A state setter in a finally block is banned, because it is a busy flag reset by hand (U9). Use const [isPending, startTransition] = useTransition() from react.";

const JSON_CAST_MESSAGE =
  "A cast of JSON.parse output with as is banned (J1), because the value is not checked. Use a type guard or a Schema decoder built once at module level.";

const FLAG_MESSAGE =
  "An optional boolean flag (isX?: boolean or Schema.optionalKey(Schema.Boolean)) is banned (L4). Use a required isX: boolean (Schema.Boolean) that every producer sets.";

const COPY_MESSAGE =
  "A UI text literal in a JSX attribute (title, aria-label, data-tip, placeholder, alt) is banned (U6). Use a string from the feature copy.ts, for example apps/desktop/src/ui/features/<feature>/copy.ts.";

const PARAM_WRITE_MESSAGE =
  "A write to a field of a function parameter is banned, because decoded values are readonly and the caller sees the change. Use a new object, for example ({ ...item, isLegacy: true }).";

const noUiStorage = rule((context) => ({
  Identifier: (node) => {
    if (!STORAGE_NAMES.has(node.name)) {
      return;
    }

    const isKey = node.parent?.type === "Property" && node.parent.key === node && !node.parent.computed;

    if (!isKey) {
      context.report({ message: STORAGE_MESSAGE, node });
    }
  },
}));

const isInFinally = (node) => {
  let current = node;

  while (current.parent) {
    const { parent } = current;

    if (FUNCTION_TYPES.has(parent.type)) {
      return false;
    }

    if (parent.type === "TryStatement" && parent.finalizer === current) {
      return true;
    }

    current = parent;
  }

  return false;
};

const noFinallyStateReset = rule((context) => ({
  CallExpression: (node) => {
    if (node.callee.type === "Identifier" && SETTER.test(node.callee.name) && isInFinally(node)) {
      context.report({ message: FINALLY_MESSAGE, node });
    }
  },
}));

const isJsonObject = (callee) => callee.object.type === "Identifier" && callee.object.name === "JSON";

const isJsonParse = (node) => {
  if (node?.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
    return false;
  }

  return isJsonObject(node.callee) && lastName(node.callee) === "parse";
};

const checkCast = (context, node) => {
  if (isJsonParse(node.expression)) {
    context.report({ message: JSON_CAST_MESSAGE, node });
  }
};

const noJsonCast = rule((context) => ({
  TSAsExpression: (node) => checkCast(context, node),
  TSTypeAssertion: (node) => checkCast(context, node),
}));

const isOptionalBoolean = (value) => {
  if (value?.type !== "CallExpression" || !OPTIONAL_CALLS.has(lastName(value.callee) ?? "")) {
    return false;
  }

  const [inner = null] = value.arguments;

  return inner !== null && lastName(inner) === "Boolean";
};

const isBooleanType = (signature) => signature.typeAnnotation?.typeAnnotation?.type === "TSBooleanKeyword";

const noOptionalFlag = rule((context) => ({
  Property: (node) => {
    if (FLAG_NAME.test(keyName(node) ?? "") && isOptionalBoolean(node.value)) {
      context.report({ message: FLAG_MESSAGE, node });
    }
  },
  TSPropertySignature: (node) => {
    const isFlag = node.key.type === "Identifier" && FLAG_NAME.test(node.key.name);

    if (node.optional && isFlag && isBooleanType(node)) {
      context.report({ message: FLAG_MESSAGE, node });
    }
  },
}));

const attributeName = (node) => {
  if (node.name.type === "JSXIdentifier") {
    return node.name.name;
  }

  return null;
};

const noInlineCopy = rule((context) => ({
  JSXAttribute: (node) => {
    const name = attributeName(node);

    if (name === null || !COPY_ATTRIBUTES.has(name) || node.value?.type !== "Literal") {
      return;
    }

    if (HAS_LETTER.test(String(node.value.value))) {
      context.report({ message: COPY_MESSAGE, node });
    }
  },
}));

const nearestFunction = (node) => {
  let current = node.parent;

  while (current && !FUNCTION_TYPES.has(current.type)) {
    current = current.parent;
  }

  return current ?? null;
};

const paramNames = (fn) =>
  fn.params.flatMap((param) => {
    if (param.type === "Identifier") {
      return [param.name];
    }

    if (param.type === "AssignmentPattern" && param.left.type === "Identifier") {
      return [param.left.name];
    }

    return [];
  });

const rootObject = (node) => {
  let current = node;

  while (current.type === "MemberExpression") {
    current = current.object;
  }

  return current;
};

const noParamFieldWrite = rule((context) => ({
  AssignmentExpression: (node) => {
    if (node.left.type !== "MemberExpression") {
      return;
    }

    const root = rootObject(node.left);
    const fn = nearestFunction(node);

    if (root.type === "Identifier" && fn !== null && paramNames(fn).includes(root.name)) {
      context.report({ message: PARAM_WRITE_MESSAGE, node });
    }
  },
}));

export { noFinallyStateReset, noInlineCopy, noJsonCast, noOptionalFlag, noParamFieldWrite, noUiStorage };
