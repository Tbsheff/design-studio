import type { RunStatus } from "@design-studio/contracts";

import { formatMs, formatTime, formatUsd } from "../../domain/format.js";
import type { RunView } from "./run-state-model.js";
import { SKILL_TOOL, skillToolName } from "./tool-labels-model.js";

const SMALL_COST_BELOW = 0.01;
const PRECISE_DIGITS = 4;

const STATUS_TEXT: Record<RunStatus, string> = {
  budget_exceeded: "Spending limit reached",
  canceled: "Canceled",
  completed: "Completed",
  failed: "Failed",
  running: "Running",
};

const SMALL_COST = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumSignificantDigits: 3,
  style: "currency",
});

type RunSummary = NonNullable<RunView["summary"]>;

const preciseUsd = (amount: number): string => {
  if (amount < SMALL_COST_BELOW) {
    return SMALL_COST.format(amount);
  }

  return `$${amount.toFixed(PRECISE_DIGITS)}`;
};

const toShownCost = (costUsd: number): string => {
  if (costUsd !== Number(costUsd.toFixed(2))) {
    return `${formatUsd(costUsd)} (${preciseUsd(costUsd)})`;
  }

  return formatUsd(costUsd);
};

const costText = (summary: RunSummary): string => {
  const shown = toShownCost(summary.costUsd);

  if (summary.status === "canceled") {
    return `${shown} (estimate)`;
  }

  return shown;
};

const toSummaryRows = (summary: RunSummary): [string, string][] => [
  ["Status", STATUS_TEXT[summary.status] ?? summary.status],
  ["Model", summary.model],
  ["Cost", costText(summary)],
  ["Duration", formatMs(summary.durationMs)],
  ["Model time", formatMs(summary.modelMs)],
  ["Tool time", formatMs(summary.toolMs)],
  ["Input tokens", summary.usage.inputTokens.toLocaleString()],
  ["Output tokens", summary.usage.outputTokens.toLocaleString()],
  ["Cache read", summary.usage.cacheReadTokens.toLocaleString()],
  ["Cache write", summary.usage.cacheWriteTokens.toLocaleString()],
  ["Version", summary.versionId ?? "None"],
  ["Session", summary.sessionId ?? "None"],
];

const toBaseRows = (run: RunView): [string, string][] => {
  if (run.summary) {
    return toSummaryRows(run.summary);
  }

  return [
    ["Status", STATUS_TEXT[run.status] ?? run.status],
    ["Started", formatTime(run.startedAt)],
  ];
};

const toSkillsUsed = (run: RunView): string => {
  const names = new Set<string>();

  for (const tool of run.tools) {
    if (tool.name === SKILL_TOOL) {
      names.add(skillToolName(tool.input) || "unknown");
    }
  }

  if (names.size === 0) {
    return "None";
  }

  return [...names].join(", ");
};

const toRunRows = (run: RunView): [string, string][] => [
  ...toBaseRows(run),
  ["Skills used", toSkillsUsed(run)],
];

export { toRunRows };
