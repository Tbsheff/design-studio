import { rule } from "./ast.js";
import { sourceOf } from "./facts.js";
import { DAY_ONE_BUDGET_ZERO } from "./frozen.js";

const GATE = "scripts/lint-gate.ts";

const BUDGET_LIST = /const BUDGET_ZERO = \[(?<body>[^\]]*)\]/u;

const QUOTED = /"(?<value>[^"]+)"/gu;

const DAY_ONE_MESSAGE =
  "A lint/day-one.ts entry for a file in a budget-0 folder is banned (L6), because it turns that file's errors into warnings. Use a code fix in the file, or the narrowest spec-forced entry in decisionOverrides in lint/decisions.ts.";

const cache = { prefixes: null };

const budgetPrefixes = () => {
  if (cache.prefixes === null) {
    const match = BUDGET_LIST.exec(sourceOf(GATE) ?? "");
    const body = match?.groups.body ?? "";

    cache.prefixes = [...body.matchAll(QUOTED)].map((found) => found.groups.value);
  }

  return cache.prefixes;
};

const isFilesList = (node) =>
  node.parent?.type === "ArrayExpression" &&
  node.parent.parent?.type === "VariableDeclarator" &&
  node.parent.parent.id.type === "Identifier" &&
  node.parent.parent.id.name === "FILES";

const isBudgetZero = (value) => budgetPrefixes().some((prefix) => value.startsWith(prefix));

const dayOneFrozen = rule((context) => ({
  Literal: (node) => {
    if (!isFilesList(node) || node.value !== String(node.value)) {
      return;
    }

    if (isBudgetZero(node.value) && !DAY_ONE_BUDGET_ZERO.has(node.value)) {
      context.report({ message: DAY_ONE_MESSAGE, node });
    }
  },
}));

export { dayOneFrozen };
