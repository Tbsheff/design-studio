import type { McpActivity } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { useNow } from "../../platform/clock.js";
import { pick } from "../../platform/pick.js";
import { ActivityRow } from "./activity-row.js";
import { copy } from "./copy.js";
import { DisconnectButton } from "./disconnect-button.js";
import {
  FOLD_AT,
  MCP_ACTIVE_MS,
  TICK_MS,
  toBlockState,
} from "./mcp-feed-model.js";

const McpBlock = ({
  client,
  entries,
  locked,
  onUndo,
}: {
  client: string;
  entries: McpActivity[];
  locked: boolean;
  onUndo: (versionId: string) => void;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const lastAt = entries.at(-1)?.at ?? 0;
  const now = useNow(true, TICK_MS);
  const active = now - lastAt < MCP_ACTIVE_MS;
  const hidden = pick(open, 0, Math.max(0, entries.length - FOLD_AT));
  const showAll = useCallback(() => setOpen(true), []);
  const showFewer = useCallback(() => setOpen(false), []);

  return (
    <section
      className="mcp-block"
      aria-label={`Edits by ${client}`}
      data-testid="mcp-block"
    >
      <header className="mcp-block-head">
        <span
          className="mcp-block-dot"
          data-active={active || null}
          aria-hidden="true"
        />
        <strong className="mcp-block-name">{client}</strong>
        <span className="mcp-block-state">
          {toBlockState(active, entries.length)}
        </span>
        <span className="spacer" />
        <DisconnectButton />
      </header>
      {hidden > 0 && (
        <button type="button" className="mcp-more" onClick={showAll}>
          {copy.show}
          {hidden}
          {copy.earlier}
        </button>
      )}
      <ul className="mcp-rows">
        {entries.slice(hidden).map((entry) => (
          <ActivityRow
            key={entry.id}
            entry={entry}
            locked={locked}
            onUndo={onUndo}
            readOnly={false}
          />
        ))}
      </ul>
      {open && entries.length > FOLD_AT && (
        <button type="button" className="mcp-more" onClick={showFewer}>
          {copy.showFewer}
        </button>
      )}
    </section>
  );
};

export { McpBlock };
