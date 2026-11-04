import { setTimeout as sleep } from "node:timers/promises";

import { isObject, studioJson } from "./call-types.js";
import type { Context, Json, Outcome, SurfaceResult } from "./call-types.js";

interface PendingCard {
  readonly id: string;
}

interface ApprovalPoll {
  readonly pending: readonly PendingCard[];
}

interface Approver {
  readonly answered: string[];
  readonly stop: () => Promise<void>;
}

interface ApproverState {
  isRunning: boolean;
}

const RETRY_MS = 200;

const answerCard = async (
  context: Context,
  answered: string[],
  card: PendingCard
): Promise<void> => {
  if (answered.includes(card.id)) {
    return;
  }

  answered.push(card.id);

  await studioJson(context, `/api/mcp/approvals/${card.id}`, { allow: true });
};

const answerPending = async (
  context: Context,
  answered: string[]
): Promise<void> => {
  const seen = encodeURIComponent(answered.join(","));

  const poll = await studioJson<ApprovalPoll>(
    context,
    `/api/mcp/approvals?wait=1&seen=${seen}`,
    null
  );

  await Promise.all(
    poll.pending.map((card) => answerCard(context, answered, card))
  );
};

const pollOnce = async (
  context: Context,
  answered: string[]
): Promise<void> => {
  try {
    await answerPending(context, answered);
  } catch {
    await sleep(RETRY_MS);
  }
};

const runApprover = async (
  context: Context,
  answered: string[],
  state: ApproverState
): Promise<void> => {
  if (!state.isRunning) {
    return;
  }

  await pollOnce(context, answered);
  await runApprover(context, answered, state);
};

const startApprover = (context: Context): Approver => {
  const answered: string[] = [];
  const state: ApproverState = { isRunning: context.action.confirm === "user" };
  const running = runApprover(context, answered, state);

  const stop = async (): Promise<void> => {
    state.isRunning = false;
    await running;
  };

  return { answered, stop };
};

const canonical = (value: Json): Json => {
  if (Array.isArray(value)) {
    return value.map((entry: Json) => canonical(entry));
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((key) => [key, canonical(value[key] ?? null)])
    );
  }

  return value;
};

const pretty = (value: Json): string =>
  JSON.stringify(canonical(value), null, 2);

const lineDiff = (left: string, right: string): string[] => {
  const before = left.split("\n");
  const after = right.split("\n");
  const size = Math.max(before.length, after.length);
  const lines: string[] = [];

  for (let at = 0; at < size; at += 1) {
    if (before[at] !== after[at]) {
      lines.push(`- ${before[at] ?? ""}`, `+ ${after[at] ?? ""}`);
    }
  }

  return lines;
};

const isOutcome = (result: SurfaceResult): result is Outcome =>
  "output" in result;

const formatResult = (result: SurfaceResult): string => {
  if ("reason" in result) {
    return `[${result.surface}] skipped: ${result.reason}`;
  }

  if ("error" in result) {
    return `[${result.surface}] failed: ${result.error}`;
  }

  const spawns = result.spawns ?? "not counted (server side)";
  const kind = (result.isError && "error") || "ok";

  return `[${result.surface}] ${kind}, ${result.ms} ms, git spawns: ${spawns}\n${pretty(result.output)}`;
};

const diffPair = (first: Outcome, other: Outcome): string | null => {
  const lines = lineDiff(pretty(first.output), pretty(other.output));

  if (lines.length === 0 && first.isError === other.isError) {
    return null;
  }

  return `diff ${first.surface} -> ${other.surface}:\n${lines.join("\n")}`;
};

const diffOutcomes = (outcomes: readonly Outcome[]): string[] => {
  const [first, ...rest] = outcomes;

  if (!first) {
    return [];
  }

  return rest.flatMap((other) => {
    const diff = diffPair(first, other);

    if (diff === null) {
      return [];
    }

    return [diff];
  });
};

export { diffOutcomes, formatResult, isOutcome, startApprover };
