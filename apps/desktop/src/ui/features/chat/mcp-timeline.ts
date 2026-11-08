import type { RunView } from "./run-state-model.js";
import type {
  McpFeedControl,
  McpFeedState,
  TimelineItem,
} from "./use-mcp-feed.js";

const timelineOf = (
  runs: readonly RunView[],
  feed: McpFeedState | null
): TimelineItem[] => {
  const items: TimelineItem[] = runs.map((run) => ({
    at: run.startedAt,
    key: run.runId,
    kind: "run",
    run,
  }));

  if (!feed) {
    return items;
  }

  for (const card of feed.approvals) {
    const at = card.approval.createdAt;
    const key = `approval-${card.approval.id}`;
    items.push({ at, card, key, kind: "approval" });
  }

  const singles: TimelineItem[] = feed.activity.map((entry) => ({
    at: entry.at,
    client: entry.client,
    entries: [entry],
    key: `mcp-${entry.id}`,
    kind: "block",
  }));

  const sorted = [...items, ...singles].toSorted(
    (left, right) => left.at - right.at
  );

  const out: TimelineItem[] = [];

  for (const item of sorted) {
    const last = out.at(-1);

    if (
      item.kind === "block" &&
      last?.kind === "block" &&
      last.client === item.client
    ) {
      last.entries.push(...item.entries);
    } else if (item.kind === "block") {
      out.push({ ...item, entries: [...item.entries] });
    } else {
      out.push(item);
    }
  }

  return out;
};

const feedShown = (mcp: McpFeedControl | null): boolean => {
  if (mcp === null) {
    return false;
  }

  return mcp.activity.length > 0 || mcp.approvals.length > 0;
};

export { feedShown, timelineOf };
