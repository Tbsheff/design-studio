import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";
import { relativeOf } from "./facts.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const FROZEN_LISTS = new Set([
  "DAY_ONE_BUDGET_ZERO",
  "FILES",
  "FROZEN_AREAS",
  "FROZEN_EXEMPTIONS",
  "LEGACY_OVERRIDES",
  "SCOPE_EXEMPTIONS",
]);

const QUOTED = /"(?<value>[^"\n]+)"/gu;

const PIN_MESSAGE =
  "A new entry in a frozen lint list (lint/plugins/studio/frozen.js, lint/day-one.ts) is banned (L6), because these lists may only shrink. Use a code fix in the file, or the narrowest spec-forced entry in decisionOverrides in lint/decisions.ts.";

const cache = new Map();

const readCommitted = (relative) => {
  try {
    return execFileSync("git", ["show", `HEAD:${relative}`], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

const toValues = (text) => {
  if (text === null) {
    return null;
  }

  return new Set([...text.matchAll(QUOTED)].map((found) => found.groups.value));
};

const committedOf = (relative) => {
  if (!cache.has(relative)) {
    cache.set(relative, toValues(readCommitted(relative)));
  }

  return cache.get(relative);
};

const holderOf = (array) => {
  if (array.parent?.type === "NewExpression") {
    return array.parent;
  }

  return array;
};

const listNameOf = (node) => {
  if (node.parent?.type !== "ArrayExpression") {
    return null;
  }

  const declarator = holderOf(node.parent).parent;

  if (declarator?.type !== "VariableDeclarator" || declarator.id.type !== "Identifier") {
    return null;
  }

  return declarator.id.name;
};

const frozenPin = rule((context) => {
  const relative = relativeOf(context.filename);

  return {
    Literal: (node) => {
      if (node.value !== String(node.value) || !FROZEN_LISTS.has(listNameOf(node))) {
        return;
      }

      const committed = committedOf(relative.split(path.sep).join("/"));

      if (committed !== null && !committed.has(node.value)) {
        context.report({ message: PIN_MESSAGE, node });
      }
    },
  };
});

export { frozenPin };
