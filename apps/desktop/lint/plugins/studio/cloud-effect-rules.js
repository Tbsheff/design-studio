import { rule } from "./ast.js";

const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

const LOOP_TYPES = new Set(["DoWhileStatement", "ForInStatement", "ForOfStatement", "ForStatement", "WhileStatement"]);

const LOOP_METHODS = new Set(["every", "filter", "flatMap", "forEach", "map", "reduce", "some"]);

const RUN_METHODS = new Set(["all", "first", "raw", "run"]);

const SQL_WRITE = /^\s*(?:UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/iu;

const ORG_FILTER = /\borg_id\s*=|:org\b/iu;

const READ_MARK = 'declare public readonly access: "read"';

const ASYNC_MESSAGE =
  "async and await in cloud Effect code are banned (S11). Use Effect.fn with Effect.tryPromise from effect, and keep async only in a Durable Object class body.";

const PREPARE_MESSAGE =
  "Raw db.prepare() outside the tenant gate is banned, because it skips the :org bind and the org_id row check. Use a tq statement in apps/api/src/tenant/repos/<table>.ts run through TenantDb from apps/api/src/tenant/db.ts.";

const LOOP_MESSAGE =
  "A query that runs inside a loop or an array callback is banned (T8). Use one db.batch for the rows, through TenantDb.writeAll from apps/api/src/tenant/db.ts.";

const ORG_FILTER_MESSAGE =
  "An UPDATE or DELETE without an org_id = term is banned, because it changes rows of every org. Use WHERE <alias>.org_id = :org in a tq statement in apps/api/src/tenant/repos/<table>.ts.";

const CURRENT_ORG_MESSAGE =
  "Effect.provideService(CurrentOrg, ...) outside apps/api/src/http/middleware is banned (T1, T9), because the role and via values are made up. Use the group middleware in apps/api/src/http/middleware (for example withShare in viewer.ts) to provide the scope once per request.";

const STUB_MESSAGE =
  'A Durable Object stub in a service marked access: "read" is banned (S6), because a stub call can write. Use a write service (access: "write") in its own file, for example apps/api/src/viewer/unlock-lockout-client.ts.';

const IDENTITY_MESSAGE =
  "A map that returns its argument with no change is banned, because it does nothing. Use the value as it is and delete the map.";

const isFunction = (node) => FUNCTION_TYPES.has(node?.type);

const isDurableClass = (node) =>
  (node?.type === "ClassDeclaration" || node?.type === "ClassExpression") &&
  node.superClass?.type === "Identifier" &&
  node.superClass.name === "DurableObject";

const isInDurableClass = (node) => {
  let current = node.parent;

  while (current) {
    if (current.type === "ClassBody" && isDurableClass(current.parent)) {
      return true;
    }

    current = current.parent;
  }

  return false;
};

const reportAsync = (context, node) => {
  if (!isInDurableClass(node)) {
    context.report({ message: ASYNC_MESSAGE, node });
  }
};

const reportAsyncFunction = (context, node) => {
  if (node.async) {
    reportAsync(context, node);
  }
};

const noCloudAsync = rule((context) => ({
  ArrowFunctionExpression: (node) => reportAsyncFunction(context, node),
  AwaitExpression: (node) => reportAsync(context, node),
  FunctionDeclaration: (node) => reportAsyncFunction(context, node),
  FunctionExpression: (node) => reportAsyncFunction(context, node),
}));

const memberName = (callee) => {
  if (callee?.type !== "MemberExpression" || callee.computed) {
    return null;
  }

  return callee.property.name;
};

const noRawPrepare = rule((context) => ({
  CallExpression: (node) => {
    if (memberName(node.callee) === "prepare") {
      context.report({ message: PREPARE_MESSAGE, node });
    }
  },
}));

const hasPrepare = (node) => {
  let current = node;

  while (current?.type === "CallExpression" && current.callee.type === "MemberExpression") {
    if (memberName(current.callee) === "prepare") {
      return true;
    }

    current = current.callee.object;
  }

  return false;
};

const isLoopCallback = (fn) =>
  fn.parent?.type === "CallExpression" &&
  fn.parent.arguments.includes(fn) &&
  LOOP_METHODS.has(memberName(fn.parent.callee));

const isInLoop = (node) => {
  let current = node.parent;

  while (current) {
    if (LOOP_TYPES.has(current.type)) {
      return true;
    }

    if (isFunction(current)) {
      return isLoopCallback(current);
    }

    current = current.parent;
  }

  return false;
};

const noQueryInLoop = rule((context) => ({
  CallExpression: (node) => {
    if (!RUN_METHODS.has(memberName(node.callee)) || !hasPrepare(node.callee.object)) {
      return;
    }

    if (isInLoop(node)) {
      context.report({ message: LOOP_MESSAGE, node });
    }
  },
}));

const checkSql = (context, node, text) => {
  if (SQL_WRITE.test(text) && !ORG_FILTER.test(text)) {
    context.report({ message: ORG_FILTER_MESSAGE, node });
  }
};

const sqlWriteOrgFilter = rule((context) => ({
  Literal: (node) => {
    if (node.value === String(node.value)) {
      checkSql(context, node, node.value);
    }
  },
  TemplateLiteral: (node) => {
    checkSql(context, node, node.quasis.map((quasi) => quasi.value.raw).join(" "));
  },
}));

const isProvideService = (callee) =>
  memberName(callee) === "provideService" || (callee?.type === "Identifier" && callee.name === "provideService");

const noCurrentOrgProvide = rule((context) => ({
  CallExpression: (node) => {
    if (!isProvideService(node.callee)) {
      return;
    }

    const isCurrentOrg = node.arguments.some((argument) => argument.type === "Identifier" && argument.name === "CurrentOrg");

    if (isCurrentOrg) {
      context.report({ message: CURRENT_ORG_MESSAGE, node });
    }
  },
}));

const readServiceNoStub = rule((context) => {
  if (!context.sourceCode.text.includes(READ_MARK)) {
    return {};
  }

  return {
    MemberExpression: (node) => {
      if (!node.computed && node.property.name === "idFromName") {
        context.report({ message: STUB_MESSAGE, node });
      }
    },
    TSTypeReference: (node) => {
      if (node.typeName.type === "Identifier" && node.typeName.name === "DurableObjectStub") {
        context.report({ message: STUB_MESSAGE, node });
      }
    },
  };
});

const isIdentityArrow = (node) => {
  if (node?.type !== "ArrowFunctionExpression" || node.params.length !== 1) {
    return false;
  }

  const [param] = node.params;

  return param.type === "Identifier" && node.body.type === "Identifier" && node.body.name === param.name;
};

const noIdentityMap = rule((context) => ({
  CallExpression: (node) => {
    const [first = null] = node.arguments;

    if (memberName(node.callee) === "map" && isIdentityArrow(first)) {
      context.report({ message: IDENTITY_MESSAGE, node });
    }
  },
}));

export {
  noCloudAsync,
  noCurrentOrgProvide,
  noIdentityMap,
  noQueryInLoop,
  noRawPrepare,
  readServiceNoStub,
  sqlWriteOrgFilter,
};
