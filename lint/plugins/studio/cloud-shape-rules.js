import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const ENTRY = "apps/api/src/index.ts";

const RUN_FOLDERS = /^apps\/api\/src\/(?:http|mcp)\//u;

const LAYER_FOLDERS = /^apps\/api\/src\/platform\//u;

const BINDING_FOLDERS = /^apps\/api\/src\/(?:platform|tenant|auth|http\/middleware)\//u;

const SCOPE_TYPES = new Set(["CurrentOrgApi", "PublicScope", "ShareScope", "ViewerScopeApi"]);

const RUN_METHODS = new Set(["runFork", "runPromise", "runPromiseExit", "runSync"]);

const PLATFORM_SERVICES = new Set(["CloudBindings", "CloudSettings"]);

const STATUS_NAME = /^(?:HTTP_[A-Z_]+|[A-Z_]+_STATUS)$/u;

const STATUS_CODE = /^[1-5]\d{2}$/u;

const HTTP_FOLDER = /^apps\/api\/src\/http\//u;

const CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/u;

const MEASURE_NAME = /(?:BYTES|COUNT|DAYS|HOURS|LENGTH|LIMIT|MAX|MIN|MS|PARTS|RADIX|SECONDS|SIZE|WIDTH)/u;

const VIEWER_SCOPE_MESSAGE =
  "A viewer-scope import in a tenant repo is banned, because a repo runs under CurrentOrg and a viewer has none. Use a ViewerDb method in apps/api/src/tenant/viewer-db.ts that yields ViewerScope.";

const SCOPE_PARAM_MESSAGE =
  "A parameter typed as a scope (PublicScope, ShareScope, ViewerScopeApi, CurrentOrgApi) in tenant code is banned, because the caller can pass any orgId. Use yield* ViewerScope from apps/api/src/tenant/viewer-scope.ts or yield* CurrentOrg from apps/api/src/tenant/current-org.ts inside the method.";

const RUNTIME_MESSAGE =
  "A second ManagedRuntime.make in apps/api is banned, because each runtime builds the layers again. Use the one runtime from apps/api/src/index.ts and pass it to the mount function.";

const RUN_MESSAGE =
  "runPromise, runPromiseExit, runSync and runFork outside the cloud entry and the http and mcp adapters are banned. Use an Effect and let a mount in apps/api/src/http or apps/api/src/mcp run it with the runtime from apps/api/src/index.ts.";

const LAYER_MESSAGE =
  "CloudBindings.layer, CloudSettings.layer and configLayer outside the cloud entry are banned, because each use builds the platform layer again. Use the platform layer that apps/api/src/index.ts builds once.";

const ERROR_MESSAGE =
  "new Error in cloud Effect code is banned. Use a Schema.TaggedError from apps/api/src/tenant/errors or @design-studio/actions/_core/errors, with Effect.die for a defect.";

const STATUS_MESSAGE =
  "A local HTTP status constant in apps/api is banned. Use the status constants from @design-studio/actions/_core/errors/http-status-codes, and add a missing one to packages/common/actions/src/_core/errors/http-status-codes.ts.";

const TAG_MESSAGE =
  "An open _tag field (optional or typed string) is banned, because it drops the typed error union. Use the error union that Effect infers and Effect.catchTags from effect.";

const BINDINGS_MESSAGE =
  "A CloudBindings import outside platform, tenant, auth and http/middleware is banned, because it skips the owner of D1 and R2 access. Use a tenant service (ViewerDb, TenantBlobs or a repo) from apps/api/src/tenant.";

const isNamed = (node, name) => node?.type === "Identifier" && node.name === name;

const memberName = (node) => {
  if (node?.type !== "MemberExpression" || node.computed || node.property.type !== "Identifier") {
    return null;
  }

  return node.property.name;
};

const typeNameOf = (param) => {
  const annotation = param.typeAnnotation?.typeAnnotation ?? null;

  if (annotation?.type !== "TSTypeReference" || annotation.typeName.type !== "Identifier") {
    return null;
  }

  return annotation.typeName.name;
};

const checkScopeParams = (context, node) => {
  for (const param of node.params ?? []) {
    if (SCOPE_TYPES.has(typeNameOf(param))) {
      context.report({ message: SCOPE_PARAM_MESSAGE, node: param });
    }
  }
};

const repoNoViewerScope = rule((context) => ({
  ImportDeclaration: (node) => {
    if (String(node.source.value).endsWith("/viewer-scope.js")) {
      context.report({ message: VIEWER_SCOPE_MESSAGE, node });
    }
  },
}));

const noScopeParam = rule((context) => ({
  ArrowFunctionExpression: (node) => checkScopeParams(context, node),
  FunctionDeclaration: (node) => checkScopeParams(context, node),
  FunctionExpression: (node) => checkScopeParams(context, node),
  TSFunctionType: (node) => checkScopeParams(context, node),
  TSMethodSignature: (node) => checkScopeParams(context, node),
}));

const cloudOneRuntime = rule((context) => {
  if (relativeOf(context.filename) === ENTRY) {
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

const cloudRunEntry = rule((context) => {
  const relative = relativeOf(context.filename);

  if (relative === ENTRY || RUN_FOLDERS.test(relative)) {
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

const cloudPlatformLayer = rule((context) => {
  const relative = relativeOf(context.filename);

  if (relative === ENTRY || LAYER_FOLDERS.test(relative)) {
    return {};
  }

  return {
    Identifier: (node) => {
      const isLocalName = node.parent?.type === "ImportSpecifier" && node.parent.local === node && node.parent.imported !== node;

      if (node.name === "configLayer" && !isLocalName) {
        context.report({ message: LAYER_MESSAGE, node });
      }
    },
    MemberExpression: (node) => {
      if (node.object.type === "Identifier" && PLATFORM_SERVICES.has(node.object.name) && memberName(node) === "layer") {
        context.report({ message: LAYER_MESSAGE, node });
      }
    },
  };
});

const isEffectImport = (statement) =>
  statement.type === "ImportDeclaration" && /^effect(?:\/|$)/u.test(String(statement.source.value));

const noPlainError = rule((context) => {
  const state = { isEffect: false };

  return {
    NewExpression: (node) => {
      if (state.isEffect && isNamed(node.callee, "Error")) {
        context.report({ message: ERROR_MESSAGE, node });
      }
    },
    Program: (node) => {
      state.isEffect = node.body.some(isEffectImport);
    },
  };
});

const MIN_HTTP_FOLDER_STATUS = 200;

const isStatusName = (name, isHttpFile) => {
  if (STATUS_NAME.test(name)) {
    return true;
  }

  return isHttpFile && CONSTANT_NAME.test(name) && !MEASURE_NAME.test(name);
};

const noLocalHttpStatus = rule((context) => ({
  VariableDeclarator: (node) => {
    const isHttpFile = HTTP_FOLDER.test(relativeOf(context.filename));

    if (node.id.type !== "Identifier" || !isStatusName(node.id.name, isHttpFile)) {
      return;
    }

    const isCode = node.init?.type === "Literal" && STATUS_CODE.test(String(node.init.value));

    if (isCode && (!isHttpFile || STATUS_NAME.test(node.id.name) || node.init.value >= MIN_HTTP_FOLDER_STATUS)) {
      context.report({ message: STATUS_MESSAGE, node });
    }
  },
}));

const isOpenTag = (node) =>
  node.optional === true || node.typeAnnotation?.typeAnnotation?.type === "TSStringKeyword";

const noOpenTag = rule((context) => ({
  TSPropertySignature: (node) => {
    if (isNamed(node.key, "_tag") && isOpenTag(node)) {
      context.report({ message: TAG_MESSAGE, node });
    }
  },
}));

const noDirectBindings = rule((context) => {
  const relative = relativeOf(context.filename);

  if (relative === ENTRY || BINDING_FOLDERS.test(relative)) {
    return {};
  }

  return {
    ImportSpecifier: (node) => {
      const isType = node.importKind === "type" || node.parent?.importKind === "type";

      if (!isType && isNamed(node.imported, "CloudBindings")) {
        context.report({ message: BINDINGS_MESSAGE, node });
      }
    },
  };
});

export {
  cloudOneRuntime,
  cloudPlatformLayer,
  cloudRunEntry,
  noDirectBindings,
  noLocalHttpStatus,
  noOpenTag,
  noPlainError,
  noScopeParam,
  repoNoViewerScope,
};
