import { keyName, rule } from "./ast.js";
import { relativeOf } from "./facts.js";
import { committedTextOf, isChanged, isCommitted } from "./freeze-rules.js";

const FLAG_NAME = /^(?:is|has|can|should)[A-Z0-9]/u;

const MODULE_VERB =
  /^(?:get|list|search|inspect|create|update|set|insert|rename|move|duplicate|delete|restore|start|stop|run|apply|export|import|publish|unpublish|share|to|from|is|has|can|should)(?:[A-Z0-9]|$)/u;

const SHORT_WORDS = new Set(["cf", "cfg", "ctx", "msg", "pid", "sig"]);

const SHORT_WHOLE = new Set(["org"]);

const SPEC_SERVICE_NAMES = new Set(["CfCli", "CfFailed", "cf"]);

const PLAN_FIXED_WIRE_FIELDS = new Map([["CloudRefSchema", new Set(["pid", "sig"])]]);

const SCHEMA_CALLS = new Set(["Struct", "looseObject", "object", "strictObject"]);

const SCHEMA_WRAPPERS = new Set(["NullOr", "UndefinedOr", "optional", "optionalKey"]);

const BOOLEAN_MESSAGE =
  "A boolean field whose name does not start with is, has, can or should is banned. Use isX, hasX, canX or shouldX as AGENTS.md N5 says, for example isBound for bound.";

const PREDICATE_MESSAGE =
  "A function that returns a boolean and does not start with is, has, can or should is banned. Use isX, hasX, canX or shouldX as AGENTS.md N5 says, for example isOrgCapAllowed for orgCapAllows.";

const SHORT_MESSAGE =
  "A short form in a name (pid, sig, cf, ctx, cfg, msg, or org alone) is banned. Use the full word as AGENTS.md N6 says: projectId, signature, cloudflare, context, config, message, orgId.";

const VERB_MESSAGE =
  "A top-level function whose name does not start with an allowed verb is banned. Use a verb from docs/naming.md section 4, or to, from, is, has, can, should (for example toSafeSegment for safeSegment).";

const NEW_VERB_MESSAGE =
  "A new or moved top-level function whose name does not start with an allowed verb is banned (N5b), because a move is the cheap moment to fix a noun name. Use a verb from docs/naming.md section 4, or to, from, is, has, can, should (toDevChromeExpression for devChromeExpression, toProjectErrors for errorsOfProjects).";

const isNamedObject = (node, objectName) =>
  node.object.type === "Identifier" && node.object.name === objectName;

const isMember = (node, objectName, propertyName) =>
  node?.type === "MemberExpression" &&
  isNamedObject(node, objectName) &&
  !node.computed &&
  node.property.name === propertyName;

const isBooleanLiteral = (node) =>
  node?.type === "Literal" && (node.value === true || node.value === false);

const isBooleanType = (type) => {
  if (type?.type === "TSBooleanKeyword") {
    return true;
  }

  return type?.type === "TSLiteralType" && isBooleanLiteral(type.literal);
};

const calleeName = (call) => {
  if (call.callee.type !== "MemberExpression" || call.callee.computed) {
    return null;
  }

  return call.callee.property.name;
};

const innerSchemaOf = (node) => {
  const name = calleeName(node);

  if (SCHEMA_WRAPPERS.has(name)) {
    return node.arguments[0] ?? null;
  }

  if (node.callee.type === "MemberExpression" && node.callee.object.type === "CallExpression") {
    return node.callee.object;
  }

  return null;
};

const unwrapSchema = (node) => {
  let current = node;

  while (current?.type === "CallExpression") {
    const inner = innerSchemaOf(current);

    if (inner === null) {
      return current;
    }

    current = inner;
  }

  return current;
};

const isBooleanCall = (node) => {
  const name = calleeName(node);

  if (isMember(node.callee, "z", "boolean")) {
    return true;
  }

  return (name === "Literal" || name === "literal") && isBooleanLiteral(node.arguments[0]);
};

const isBooleanSchema = (node) => {
  const root = unwrapSchema(node);

  if (isMember(root, "Schema", "Boolean")) {
    return true;
  }

  return root?.type === "CallExpression" && isBooleanCall(root);
};

const typeArgumentsOf = (type) => (type.typeArguments ?? type.typeParameters)?.params ?? [];

const isWrappedBoolean = (type) => {
  const [first] = typeArgumentsOf(type);
  const { typeName } = type;
  const isPromise = typeName.type === "Identifier" && typeName.name === "Promise";
  const isEffect = typeName.type === "TSQualifiedName" && typeName.right.name === "Effect";

  return (isPromise || isEffect) && isBooleanType(first);
};

const isBooleanReturn = (annotation) => {
  const type = annotation?.typeAnnotation ?? null;

  if (type === null) {
    return false;
  }

  if (isBooleanType(type) || type.type === "TSTypePredicate") {
    return true;
  }

  return type.type === "TSTypeReference" && isWrappedBoolean(type);
};

const isFunctionNode = (node) =>
  node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const topLevelFunctions = (program) =>
  program.body.flatMap((node) => {
    const declaration = node.declaration ?? node;

    if (declaration.type === "FunctionDeclaration" && declaration.id) {
      return [{ fn: declaration, id: declaration.id }];
    }

    if (declaration.type !== "VariableDeclaration") {
      return [];
    }

    return declaration.declarations.flatMap((declarator) => {
      if (declarator.id.type === "Identifier" && isFunctionNode(declarator.init)) {
        return [{ fn: declarator.init, id: declarator.id }];
      }

      return [];
    });
  });

const signatureReturn = (node) => {
  if (node.type === "TSMethodSignature") {
    return node.returnType ?? null;
  }

  const type = node.typeAnnotation?.typeAnnotation;

  if (type?.type === "TSFunctionType") {
    return type.returnType ?? null;
  }

  return null;
};

const signatureKeyOf = (node) => {
  if (node.key.type === "Identifier") {
    return node.key.name;
  }

  return null;
};

const reportFlag = (context, node, name, message) => {
  if (name !== null && !FLAG_NAME.test(name)) {
    context.report({ message, node });
  }
};

const isErrorField = (property) => {
  const call = property.parent?.parent;

  if (call?.type !== "CallExpression" || call.callee.type !== "CallExpression") {
    return false;
  }

  return isMember(call.callee.callee, "Schema", "TaggedError");
};

const booleanName = rule((context) => ({
  Property: (node) => {
    if (isBooleanSchema(node.value) && !isErrorField(node)) {
      reportFlag(context, node.key, keyName(node), BOOLEAN_MESSAGE);
    }
  },
  TSPropertySignature: (node) => {
    if (node.typeAnnotation?.typeAnnotation?.type === "TSBooleanKeyword") {
      reportFlag(context, node.key, signatureKeyOf(node), BOOLEAN_MESSAGE);
    }
  },
}));

const predicateName = rule((context) => ({
  Program: (program) => {
    for (const { fn, id } of topLevelFunctions(program)) {
      if (isBooleanReturn(fn.returnType)) {
        reportFlag(context, id, id.name, PREDICATE_MESSAGE);
      }
    }
  },
  TSMethodSignature: (node) => {
    if (isBooleanReturn(signatureReturn(node))) {
      reportFlag(context, node.key, keyName(node), PREDICATE_MESSAGE);
    }
  },
  TSPropertySignature: (node) => {
    if (isBooleanReturn(signatureReturn(node))) {
      reportFlag(context, node.key, keyName(node), PREDICATE_MESSAGE);
    }
  },
}));

const HOOK_NAME = /^use[A-Z]/u;

const COMPONENT_NAME = /^[A-Z]/u;

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const toNearestFunction = (node) => {
  let current = node.parent;

  while (current && !FUNCTION_TYPES.has(current.type)) {
    current = current.parent;
  }

  return current ?? null;
};

const isComponentCandidate = (filename, name) =>
  filename.endsWith(".tsx") && COMPONENT_NAME.test(name);

const moduleFunctionVerb = rule((context) => {
  const candidates = [];
  const jsxFunctions = new Set();

  const markJsx = (node) => {
    jsxFunctions.add(toNearestFunction(node));
  };

  return {
    JSXElement: markJsx,
    JSXFragment: markJsx,
    Program: (program) => {
      for (const { fn, id } of topLevelFunctions(program)) {
        if (!MODULE_VERB.test(id.name) && !HOOK_NAME.test(id.name)) {
          candidates.push({ fn, id });
        }
      }
    },
    "Program:exit": () => {
      for (const { fn, id } of candidates) {
        const isComponent = isComponentCandidate(context.filename, id.name) && jsxFunctions.has(fn);

        if (!isComponent) {
          context.report({ message: VERB_MESSAGE, node: id });
        }
      }
    },
  };
});

const committedTextAt = (relative) => {
  if (!isCommitted(relative)) {
    return null;
  }

  return committedTextOf(relative);
};

const isDeclaredIn = (text, name) => {
  if (text === null) {
    return false;
  }

  return new RegExp(`(?:const|let|var|function\\*?)\\s+${name}\\b`, "u").test(text);
};

const newFunctionVerb = rule((context) => ({
  Program: (program) => {
    const relative = relativeOf(context.filename);

    if (!isChanged(relative)) {
      return;
    }

    const committed = committedTextAt(relative);

    for (const { id } of topLevelFunctions(program)) {
      if (!MODULE_VERB.test(id.name) && !isDeclaredIn(committed, id.name)) {
        context.report({ message: NEW_VERB_MESSAGE, node: id });
      }
    }
  },
}));

const toWords = (name) =>
  name
    .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$<lower> $<upper>")
    .replaceAll(/(?<run>[A-Z])(?<next>[A-Z][a-z])/gu, "$<run> $<next>")
    .toLowerCase()
    .split(/[\s_]+/u);

const isShortName = (name) => {
  if (SPEC_SERVICE_NAMES.has(name)) {
    return false;
  }

  return SHORT_WHOLE.has(name) || toWords(name).some((word) => SHORT_WORDS.has(word));
};

const schemaOwnerOf = (property) => {
  const call = property.parent?.parent;

  if (call?.type !== "CallExpression" || !SCHEMA_CALLS.has(calleeName(call))) {
    return null;
  }

  const declarator = call.parent;

  if (declarator?.type === "VariableDeclarator" && declarator.id.type === "Identifier") {
    return declarator.id.name;
  }

  return "";
};

const isWireField = (owner, name) => PLAN_FIXED_WIRE_FIELDS.get(owner)?.has(name) === true;

const checkSchemaKey = (context, node) => {
  const owner = schemaOwnerOf(node);
  const name = keyName(node);

  if (owner === null || name === null || isWireField(owner, name)) {
    return;
  }

  if (isShortName(name)) {
    context.report({ message: SHORT_MESSAGE, node: node.key });
  }
};

const checkIdentifier = (context, node) => {
  if (node?.type === "Identifier" && isShortName(node.name)) {
    context.report({ message: SHORT_MESSAGE, node });
  }
};

const paramIdentifier = (param) => {
  if (param.type === "AssignmentPattern") {
    return param.left;
  }

  if (param.type === "TSParameterProperty") {
    return param.parameter;
  }

  return param;
};

const checkParams = (context, node) => {
  for (const param of node.params) {
    checkIdentifier(context, paramIdentifier(param));
  }
};

const checkKey = (context, node) => {
  if (!node.computed) {
    checkIdentifier(context, node.key);
  }
};

const noShortName = rule((context) => ({
  ArrowFunctionExpression: (node) => checkParams(context, node),
  ClassDeclaration: (node) => checkIdentifier(context, node.id),
  FunctionDeclaration: (node) => {
    checkIdentifier(context, node.id);
    checkParams(context, node);
  },
  FunctionExpression: (node) => checkParams(context, node),
  MethodDefinition: (node) => checkKey(context, node),
  Property: (node) => checkSchemaKey(context, node),
  PropertyDefinition: (node) => checkKey(context, node),
  TSInterfaceDeclaration: (node) => checkIdentifier(context, node.id),
  TSPropertySignature: (node) => checkKey(context, node),
  TSTypeAliasDeclaration: (node) => checkIdentifier(context, node.id),
  VariableDeclarator: (node) => {
    checkIdentifier(context, node.id);
  },
}));

export { booleanName, moduleFunctionVerb, newFunctionVerb, noShortName, predicateName };
