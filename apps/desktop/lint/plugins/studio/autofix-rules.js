import { readdirSync } from "node:fs";
import path from "node:path";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";
import { committedTextOf } from "./freeze-rules.js";

const CASE_MESSAGE =
  "A relative import whose case differs from the file name on disk is banned (N5), because a Linux build cannot find the module. Use the exact kebab-case file name, for example @design-studio/ui for packages/ui/src/disclosure.tsx.";

const GROWTH_MESSAGE =
  "Growing a file that is over 500 lines is banned (L2). Use new files that are lint clean from the start (use-<thing>.ts, <thing>-model.ts, one component per kebab-case .tsx), or leave the split for a later slice.";

const HOOK_MESSAGE =
  "A new hook defined in a .tsx component file is banned (U6). Use a use-<thing>.ts file next to the component, and import the hook from it.";

const MODEL_MESSAGE =
  "A new import of an api, http or use-* module in a pure *-model.ts or *-values.ts file is banned (N8). Use a use-<thing>.ts hook or an edit-request-model.ts file that takes its inputs as parameters.";

const BOX_MESSAGE =
  "A module-level object that holds one mutable value (const counter = { value: 0 } with counter.value += 1) is banned (S21), because it is module state in a new form. Use useRef or useId in the component, or createLiveStore from src/ui/platform/live-store.ts.";

const IIFE_MESSAGE =
  "A void async IIFE (void (async () => { ... })()) is banned (U9a), because it hides a floating promise and the write is not in a transition. Use a named async handler inside startTransition from useTransition.";

const SOFT_MESSAGE =
  "expect.soft in an e2e spec is banned, because the spec does not stop at the first failure. Use expect from @playwright/test. Only perf specs (*perf*.spec.ts) and the e2e/ac/safety measurement specs may use expect.soft to report every budget.";

const BOOT_READ_MESSAGE =
  "A file read at module load in server code is banned (P9), because it is sync I/O on the boot path and it hides text from the lint. Use a TS const, or read the file on first use inside an Effect service.";

const LINE_BUDGET = 500;

const SOURCE_SUFFIXES = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

const BOOT_READS = new Set(["readFileSync", "readFile", "toTextResource", "getTextResource"]);

const MODEL_FILE = /-(?:model|values)\.ts$/u;

const MODEL_SOURCE = /(?:^|\/)(?:use-[a-z0-9-]+|api|[a-z0-9-]+-api|api-error|http)\.js$/u;

const HOOK_NAME = /^use[A-Z]/u;

const cache = { listings: new Map() };

const listingOf = (directory) => {
  if (!cache.listings.has(directory)) {
    try {
      cache.listings.set(directory, readdirSync(directory));
    } catch {
      cache.listings.set(directory, null);
    }
  }

  return cache.listings.get(directory);
};

const candidatesOf = (resolved) => {
  if (resolved.endsWith(".js")) {
    const base = resolved.slice(0, -".js".length);

    return [`${base}.ts`, `${base}.tsx`, resolved];
  }

  return [resolved, ...SOURCE_SUFFIXES.map((suffix) => `${resolved}${suffix}`)];
};

const caseOf = (candidate) => {
  const listing = listingOf(path.dirname(candidate));
  const name = path.basename(candidate);

  if (listing === null) {
    return "missing";
  }

  if (listing.includes(name)) {
    return "exact";
  }

  if (listing.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
    return "other";
  }

  return "missing";
};

const hasCaseMismatch = (fromFile, source) => {
  const resolved = path.resolve(path.dirname(fromFile), source);
  const found = new Set(candidatesOf(resolved).map((candidate) => caseOf(candidate)));

  return !found.has("exact") && found.has("other");
};

const sourceTextOf = (node) => {
  if (node.source?.type === "Literal" && node.source.value === String(node.source.value)) {
    return node.source.value;
  }

  return null;
};

const isRelative = (source) => source !== null && source.startsWith(".");

const importCaseExact = rule((context) => {
  const check = (node) => {
    const source = sourceTextOf(node);

    if (isRelative(source) && hasCaseMismatch(context.filename, source)) {
      context.report({ message: CASE_MESSAGE, node });
    }
  };

  return {
    ExportAllDeclaration: check,
    ExportNamedDeclaration: check,
    ImportDeclaration: check,
    ImportExpression: check,
  };
});

const lineCountOf = (text) => text.split("\n").length;

const isGrown = (context, text) => {
  const committed = committedTextOf(relativeOf(context.filename));

  return committed !== null && lineCountOf(text) > lineCountOf(committed);
};

const noFileGrowth = rule((context) => ({
  Program: (node) => {
    const { text } = context.sourceCode;

    if (lineCountOf(text) <= LINE_BUDGET || text.startsWith("// @generated")) {
      return;
    }

    if (isGrown(context, text)) {
      context.report({ message: GROWTH_MESSAGE, node });
    }
  },
}));

const hookNameOf = (node) => {
  if (node.type === "FunctionDeclaration") {
    return node.id?.name ?? null;
  }

  if (node.type !== "VariableDeclaration") {
    return null;
  }

  const [declarator = null] = node.declarations;

  if (declarator === null || declarator.id.type !== "Identifier") {
    return null;
  }

  return declarator.id.name;
};

const definedInCommitted = (committed, name) =>
  committed !== null && new RegExp(String.raw`(?:const|function) ${name}\b`, "u").test(committed);

const topStatementOf = (node) => {
  if (node.type === "ExportNamedDeclaration" && node.declaration) {
    return node.declaration;
  }

  return node;
};

const noHookInTsx = rule((context) => {
  if (!context.filename.endsWith(".tsx")) {
    return {};
  }

  const committed = committedTextOf(relativeOf(context.filename));

  return {
    Program: (program) => {
      for (const statement of program.body) {
        const name = hookNameOf(topStatementOf(statement));

        if (name !== null && HOOK_NAME.test(name) && !definedInCommitted(committed, name)) {
          context.report({ message: HOOK_MESSAGE, node: statement });
        }
      }
    },
  };
});

const isFreshImport = (committed, source) => committed === null || !committed.includes(`"${source}"`);

const pureModelImport = rule((context) => {
  if (!MODEL_FILE.test(context.filename)) {
    return {};
  }

  const committed = committedTextOf(relativeOf(context.filename));

  return {
    ImportDeclaration: (node) => {
      const source = sourceTextOf(node);

      if (source !== null && MODEL_SOURCE.test(source) && isFreshImport(committed, source)) {
        context.report({ message: MODEL_MESSAGE, node });
      }
    },
  };
});

const boxKeyOf = (declarator) => {
  const { init } = declarator;

  if (declarator.id.type !== "Identifier" || init?.type !== "ObjectExpression" || init.properties.length !== 1) {
    return null;
  }

  const [property] = init.properties;

  if (property.type !== "Property" || property.key.type !== "Identifier" || property.value.type !== "Literal") {
    return null;
  }

  return property.key.name;
};

const constDeclaratorsOf = (program) =>
  program.body.flatMap((statement) => {
    if (statement.type === "VariableDeclaration" && statement.kind === "const") {
      return statement.declarations;
    }

    return [];
  });

const boxesOf = (program) => {
  const boxes = new Map();

  for (const declarator of constDeclaratorsOf(program)) {
    const key = boxKeyOf(declarator);

    if (key !== null) {
      boxes.set(declarator.id.name, { declarator, key });
    }
  }

  return boxes;
};

const writtenBoxOf = (boxes, target) => {
  if (target?.type !== "MemberExpression" || target.computed || target.object.type !== "Identifier") {
    return null;
  }

  const box = boxes.get(target.object.name) ?? null;

  if (box === null || box.key !== target.property.name) {
    return null;
  }

  return box;
};

const noModuleBox = rule((context) => {
  if (context.filename.endsWith(".test.ts")) {
    return {};
  }

  const state = { boxes: new Map(), reported: new Set() };

  const check = (target) => {
    const box = writtenBoxOf(state.boxes, target);

    if (box !== null && !state.reported.has(box)) {
      state.reported.add(box);
      context.report({ message: BOX_MESSAGE, node: box.declarator });
    }
  };

  return {
    AssignmentExpression: (node) => check(node.left),
    Program: (program) => {
      state.boxes = boxesOf(program);
    },
    UpdateExpression: (node) => check(node.argument),
  };
});

const unwrap = (node) => {
  if (node?.type === "ParenthesizedExpression") {
    return unwrap(node.expression);
  }

  return node;
};

const isAsyncIife = (node) => {
  const call = unwrap(node);

  if (call?.type !== "CallExpression") {
    return false;
  }

  const callee = unwrap(call.callee);

  return (callee?.type === "ArrowFunctionExpression" || callee?.type === "FunctionExpression") && callee.async;
};

const noVoidAsyncIife = rule((context) => ({
  UnaryExpression: (node) => {
    if (node.operator === "void" && isAsyncIife(node.argument)) {
      context.report({ message: IIFE_MESSAGE, node });
    }
  },
}));

const isSoftExpect = (node) =>
  !node.computed &&
  node.object.type === "Identifier" &&
  node.object.name === "expect" &&
  node.property.name === "soft";

const noSoftExpect = rule((context) => {
  if (/perf[^/]*\.spec\.ts$|\/e2e\/ac\/safety\//u.test(context.filename)) {
    return {};
  }

  return {
    MemberExpression: (node) => {
      if (isSoftExpect(node)) {
        context.report({ message: SOFT_MESSAGE, node });
      }
    },
  };
});

const calleeNameOf = (node) => {
  const callee = unwrap(node.callee);

  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (callee.type === "MemberExpression" && !callee.computed) {
    return callee.property.name;
  }

  return null;
};

const isInsideFunction = (node) => {
  for (let current = node.parent; current; current = current.parent) {
    if (/Function/u.test(current.type)) {
      return true;
    }
  }

  return false;
};

const noBootFileRead = rule((context) => {
  if (context.filename.endsWith(".test.ts")) {
    return {};
  }

  return {
    CallExpression: (node) => {
      if (BOOT_READS.has(calleeNameOf(node)) && !isInsideFunction(node)) {
        context.report({ message: BOOT_READ_MESSAGE, node });
      }
    },
  };
});

const autofixRules = {
  "import-case-exact": importCaseExact,
  "no-boot-file-read": noBootFileRead,
  "no-file-growth": noFileGrowth,
  "no-hook-in-tsx": noHookInTsx,
  "no-module-box": noModuleBox,
  "no-soft-expect": noSoftExpect,
  "no-void-async-iife": noVoidAsyncIife,
  "pure-model-import": pureModelImport,
};

export { autofixRules };
