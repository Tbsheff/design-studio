import type { McpActivity } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { formatTime } from "../../domain/format.js";
import { pick } from "../../platform/pick.js";
import { MCP_ACTIVE_MS } from "./mcp-feed-model.js";

const McpEditHead = ({
  last,
  now,
  isOpen,
  onToggle,
}: {
  last: McpActivity;
  now: number;
  isOpen: boolean;
  onToggle: () => void;
}): ReactElement => (
  <button
    type="button"
    className="mcp-edit-head"
    aria-expanded={isOpen}
    data-tip={pick(
      isOpen,
      "Hide the outside edits",
      "Show the recent outside edits. Undo them from the chat after you save or discard."
    )}
    data-tip-side="top"
    onClick={onToggle}
  >
    <span
      className="mcp-block-dot"
      data-active={now - last.at < MCP_ACTIVE_MS || null}
      aria-hidden="true"
    />
    <strong className="mcp-edit-client">{last.client}</strong>
    <span className="mcp-edit-summary truncate">{last.summary}</span>
    <time className="mcp-row-time" dateTime={new Date(last.at).toISOString()}>
      {formatTime(last.at)}
    </time>
    <span className="mcp-edit-caret">
      <Icon name="chevronDown" size={12} />
    </span>
  </button>
);

export { McpEditHead };
