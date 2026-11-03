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
  "UI_CROSS_FEATURE_FILES",
]);

const QUOTED = /"(?<value>[^"\n]+)"/gu;

const PIN_MESSAGE =
  "A new entry in a frozen lint list (lint/plugins/studio/frozen.js, lint/day-one.ts) is banned (L6), because these lists may only shrink. Use a code fix in the file, or the narrowest spec-forced entry in decisionOverrides in lint/decisions.ts.";

const cache = new Map();

const LISTING_BUFFER = 67_108_864;

const runGit = (args) => {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf-8",
      maxBuffer: LISTING_BUFFER,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

const readCommitted = (relative) => runGit(["show", `HEAD:${relative}`]);

const headTree = { files: null, texts: new Map() };

const isCommitted = (relative) => {
  if (headTree.files === null) {
    const listing = runGit(["ls-tree", "-r", "--name-only", "HEAD"]) ?? "";

    headTree.files = new Set(listing.split("\n").filter(Boolean));
  }

  return headTree.files.has(relative);
};

const committedTextOf = (relative) => {
  if (!headTree.texts.has(relative)) {
    headTree.texts.set(relative, readCommitted(relative));
  }

  return headTree.texts.get(relative);
};

const changedTree = { files: null };

const toNameList = (listing) => (listing ?? "").split("\0").filter(Boolean);

const isChanged = (relative) => {
  if (changedTree.files === null) {
    const tracked = toNameList(runGit(["diff", "--name-only", "-z", "HEAD"]));
    const untracked = toNameList(runGit(["ls-files", "--others", "--exclude-standard", "-z"]));

    changedTree.files = new Set([...tracked, ...untracked]);
  }

  return changedTree.files.has(relative);
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

export { committedTextOf, frozenPin, isChanged, isCommitted };
