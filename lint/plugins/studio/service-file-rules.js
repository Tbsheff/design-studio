import path from "node:path";

import { relativeOf } from "./facts.js";
import { rule } from "./ast.js";

const SERVICE_CLASS = /extends Context\.Service</u;

const ROLE = /(?:Store|Writer|Runner|Watcher|Queue|Client|Cache)$/u;

const FUNCTION_VERB =
  /^(?:get|list|search|inspect|create|update|set|insert|rename|move|duplicate|delete|restore|start|stop|run|apply|export|import|publish|unpublish|share|to|from|is|has)(?:[A-Z0-9]|$)/u;

const ADAPTER_FOLDER = /^apps\/desktop\/src\/server\/(?:http|mcp|agent-tools)\//u;

const API_MESSAGE =
  "A service API member that does not return an Effect is banned. Use Effect.Effect<A, E> as the return type, and wrap the method in Effect.fn(\"<Class>.<method>\") from effect.";

const EFFECT_ONLY_MESSAGE =
  "async, await, throw, try, new Promise and new Error are banned in a service file. Use Effect.fn with yield*, Effect.callback or Effect.promise from effect, and fail with a Schema.TaggedError from <area>/errors/<kebab>.ts.";

const FILE_NAME_MESSAGE =
  "A service file whose name is not the kebab case of its class is banned. Use apps/desktop/src/server/<area>/<class-kebab>.ts, as new:service makes it.";

const EXPORTS_MESSAGE =
  "A value export other than the service class is banned in a service file. Use a sibling file in the same folder for helpers, and export it from apps/desktop/src/server/<area>/index.ts.";

const ADAPTER_MESSAGE =
  "A Context.Service class in an adapter folder (http, mcp, agent-tools) is banned. Use apps/desktop/src/server/<area>/<class-kebab>.ts and provide it in apps/desktop/src/server/handlers/<domain>/live.ts.";

const ROLE_MESSAGE =
  "A service class name without a role suffix is banned. Use <Noun><Role> with a role from Store, Writer, Runner, Watcher, Queue, Client, Cache (docs/naming.md section 5).";

const VERB_MESSAGE =
  "A top-level function in a service file whose name does not start with an allowed verb is banned. Use a verb from docs/naming.md section 4, or to, from, is, has (for example isPortFree, toFreePort).";

const isServiceFile = (context) => SERVICE_CLASS.test(context.sourceCode.text);

const isNamed = (node, name) => node?.type === "Identifier" && node.name === name;

const isContextService = (node) =>
  node.type === "MemberExpression" &&
  isNamed(node.object, "Context") &&
  node.property.name === "Service";

const isServiceSuper = (superClass) =>
  superClass?.type === "CallExpression" &&
  superClass.callee.type === "CallExpression" &&
  isContextService(superClass.callee.callee);

const serviceClasses = (context) =>
  context.sourceCode.ast.body.flatMap((node) => {
    const declaration = node.declaration ?? node;

    if (declaration.type === "ClassDeclaration" && isServiceSuper(declaration.superClass)) {
      return [declaration];
    }

    return [];
  });

const toKebab = (name) =>
  name
    .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$<lower>-$<upper>")
    .replaceAll(/(?<run>[A-Z])(?<next>[A-Z][a-z])/gu, "$<run>-$<next>")
    .toLowerCase();

const effectReturn = (annotation) => {
  const type = annotation?.typeAnnotation ?? annotation;

  if (type?.type !== "TSTypeReference") {
    return false;
  }

  const { typeName } = type;

  return (
    typeName.type === "TSQualifiedName" &&
    typeName.left.type === "Identifier" &&
    (typeName.left.name === "Effect" || typeName.left.name === "Stream")
  );
};

const methodReturn = (member) => {
  if (member.type === "TSMethodSignature") {
    return { returnType: member.returnType ?? null };
  }

  const type = member.typeAnnotation?.typeAnnotation;

  if (type?.type === "TSFunctionType") {
    return { returnType: type.returnType ?? null };
  }

  return null;
};

const checkApi = (context, node) => {
  if (!node.id.name.endsWith("Api")) {
    return;
  }

  for (const member of node.body.body) {
    const method = methodReturn(member);

    if (method !== null && !effectReturn(method.returnType)) {
      context.report({ message: API_MESSAGE, node: member });
    }
  }
};

const serviceApiEffect = rule((context) => {
  if (!isServiceFile(context)) {
    return {};
  }

  return {
    TSInterfaceDeclaration: (node) => checkApi(context, node),
  };
});

const reportAsync = (context, node) => {
  if (node.async) {
    context.report({ message: EFFECT_ONLY_MESSAGE, node });
  }
};

const serviceEffectOnly = rule((context) => {
  if (!isServiceFile(context)) {
    return {};
  }

  const report = (node) => context.report({ message: EFFECT_ONLY_MESSAGE, node });

  return {
    ArrowFunctionExpression: (node) => reportAsync(context, node),
    AwaitExpression: report,
    FunctionDeclaration: (node) => reportAsync(context, node),
    FunctionExpression: (node) => reportAsync(context, node),
    NewExpression: (node) => {
      if (isNamed(node.callee, "Promise") || isNamed(node.callee, "Error")) {
        report(node);
      }
    },
    ThrowStatement: report,
    TryStatement: report,
  };
});

const serviceFileName = rule((context) => ({
  "Program:exit": () => {
    const base = path.basename(context.filename).replace(/\.ts$/u, "");

    for (const node of serviceClasses(context)) {
      if (toKebab(node.id.name) !== base) {
        context.report({ message: FILE_NAME_MESSAGE, node: node.id });
      }
    }
  },
}));

const valueSpecifiers = (node) => {
  if (node.exportKind === "type" || node.source) {
    return [];
  }

  return node.specifiers.filter((specifier) => specifier.exportKind !== "type");
};

const serviceFileExports = rule((context) => {
  const classes = new Set(serviceClasses(context).map((node) => node.id.name));

  if (classes.size === 0) {
    return {};
  }

  return {
    ExportNamedDeclaration: (node) => {
      if (node.declaration && node.declaration.type !== "ClassDeclaration" && node.exportKind !== "type") {
        const isType = node.declaration.type.startsWith("TS");

        if (!isType) {
          context.report({ message: EXPORTS_MESSAGE, node });
        }
      }

      for (const specifier of valueSpecifiers(node)) {
        if (!classes.has(specifier.local.name)) {
          context.report({ message: EXPORTS_MESSAGE, node: specifier });
        }
      }
    },
  };
});

const noAdapterService = rule((context) => {
  if (!ADAPTER_FOLDER.test(relativeOf(context.filename))) {
    return {};
  }

  return {
    ClassDeclaration: (node) => {
      if (isServiceSuper(node.superClass)) {
        context.report({ message: ADAPTER_MESSAGE, node: node.id ?? node });
      }
    },
  };
});

const serviceRole = rule((context) => ({
  ClassDeclaration: (node) => {
    if (isServiceSuper(node.superClass) && node.id && !ROLE.test(node.id.name)) {
      context.report({ message: ROLE_MESSAGE, node: node.id });
    }
  },
}));

const isFunctionInit = (node) =>
  node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

const topFunctions = (statement) => {
  const node = statement.declaration ?? statement;

  if (node.type === "FunctionDeclaration" && node.id) {
    return [node.id];
  }

  if (node.type !== "VariableDeclaration") {
    return [];
  }

  return node.declarations.flatMap((declarator) => {
    if (declarator.id.type === "Identifier" && isFunctionInit(declarator.init)) {
      return [declarator.id];
    }

    return [];
  });
};

const functionVerb = rule((context) => {
  if (!isServiceFile(context)) {
    return {};
  }

  return {
    "Program:exit": () => {
      for (const statement of context.sourceCode.ast.body) {
        for (const id of topFunctions(statement)) {
          if (!FUNCTION_VERB.test(id.name)) {
            context.report({ message: VERB_MESSAGE, node: id });
          }
        }
      }
    },
  };
});

export {
  functionVerb,
  noAdapterService,
  serviceApiEffect,
  serviceEffectOnly,
  serviceFileExports,
  serviceFileName,
  serviceRole,
};
