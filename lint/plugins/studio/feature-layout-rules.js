import path from "node:path";

import { rule } from "./ast.js";
import { committedTextOf, isCommitted } from "./freeze-rules.js";
import { relativeOf } from "./facts.js";

const FEATURE_PATH = /(?:^|\/)features\/(?<feature>[a-z0-9-]+)\/(?<rest>.+)$/u;

const FEATURE_FILE = /^(?:index|copy|deps|use-[a-z0-9-]+|[a-z0-9-]+-model)\.ts$|^[a-z0-9-]+\.tsx$/u;

const SHIM_MESSAGE =
  "A new re-export shim at an old UI path is banned, because it keeps a second name for one module. Use an import from apps/desktop/src/ui/features/<feature>/index.ts in each caller, and delete the shim.";

const DEEP_MESSAGE =
  "A new import past a feature index.ts is banned (AGENTS.md W13, U7). Use the export from apps/desktop/src/ui/features/<feature>/index.ts.";

const LAYOUT_MESSAGE =
  "A feature file outside the feature shape is banned (AGENTS.md U6). Use index.ts, copy.ts, deps.ts, use-<thing>.ts, <thing>-model.ts or a kebab-case .tsx component in apps/desktop/src/ui/features/<feature>/.";

const isReexport = (node) =>
  (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
  Boolean(node.source);

const targetOf = (context, source) => {
  if (!source.startsWith(".")) {
    return null;
  }

  return relativeOf(path.resolve(path.dirname(context.filename), source));
};

const featureOf = (relative) => FEATURE_PATH.exec(relative)?.groups ?? null;

const isFeatureSource = (context, source) => {
  const target = targetOf(context, source);

  return target !== null && featureOf(target) !== null;
};

const noReexportShim = rule((context) => ({
  Program: (program) => {
    const relative = relativeOf(context.filename);
    const { body } = program;

    if (featureOf(relative) !== null || body.length === 0 || isCommitted(relative)) {
      return;
    }

    if (!body.every((node) => isReexport(node))) {
      return;
    }

    if (body.some((node) => isFeatureSource(context, String(node.source.value)))) {
      context.report({ message: SHIM_MESSAGE, node: program });
    }
  },
}));

const isDeepTarget = (context, source) => {
  const target = targetOf(context, source);

  if (target === null) {
    return false;
  }

  const parts = featureOf(target);

  if (parts === null) {
    return false;
  }

  const own = featureOf(relativeOf(context.filename));

  if (own !== null && own.feature === parts.feature) {
    return false;
  }

  return !/^index(?:\.[jt]sx?)?$/u.test(parts.rest);
};

const isCommittedSource = (relative, source) => {
  const text = committedTextOf(relative);

  return text !== null && text.includes(`"${source}"`);
};

const checkDeep = (context, node) => {
  const source = node.source?.value ?? null;

  if (source === null || !isDeepTarget(context, String(source))) {
    return;
  }

  if (!isCommittedSource(relativeOf(context.filename), String(source))) {
    context.report({ message: DEEP_MESSAGE, node: node.source });
  }
};

const featureIndexImport = rule((context) => ({
  ExportAllDeclaration: (node) => checkDeep(context, node),
  ExportNamedDeclaration: (node) => checkDeep(context, node),
  ImportDeclaration: (node) => checkDeep(context, node),
  ImportExpression: (node) => checkDeep(context, node),
}));

const featureFileLayout = rule((context) => ({
  Program: (program) => {
    const parts = featureOf(relativeOf(context.filename));

    if (parts !== null && !FEATURE_FILE.test(parts.rest)) {
      context.report({ message: LAYOUT_MESSAGE, node: program });
    }
  },
}));

export { featureFileLayout, featureIndexImport, noReexportShim };
