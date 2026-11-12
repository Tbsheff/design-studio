import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { useNow } from "../../platform/clock.js";
import { McpEditHead } from "./mcp-edit-head.js";
import { McpEditRows } from "./mcp-edit-rows.js";
import { FOLD_AT, RECENT_MS, TICK_MS, isWithinMs } from "./mcp-feed-model.js";
import type { McpFeedControl, TimelineItem } from "./use-mcp-feed.js";

const McpEditStrip = ({
  mcp,
}: {
  mcp: McpFeedControl | null;
}): ReactElement | null => {
  const last = mcp?.activity.at(-1) ?? null;
  const isRecent = last !== null && isWithinMs(last.at, RECENT_MS);
  const now = useNow(isRecent, TICK_MS);
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  if (!mcp || !last || !isRecent) {
    return null;
  }

  const { onUndo } = mcp;

  const entries = mcp.activity
    .filter((entry) => entry.client === last.client)
    .slice(-FOLD_AT);

  return (
    <section
      className="mcp-edit-strip"
      aria-label={`Edits by ${last.client}`}
      data-testid="mcp-edit-strip"
    >
      {open && (
        <McpEditRows entries={entries} locked={mcp.locked} onUndo={onUndo} />
      )}
      <McpEditHead last={last} now={now} isOpen={open} onToggle={toggle} />
    </section>
  );
};

export { McpEditStrip };

export type { McpFeedControl, TimelineItem };
