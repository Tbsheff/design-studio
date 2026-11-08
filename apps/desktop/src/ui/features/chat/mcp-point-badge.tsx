import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { McpPointBadge as Badge } from "../canvas/use-canvas-point.js";
import { authorInitial } from "../comments/comment-avatar.js";
import { copy } from "./copy.js";

const McpPointBadge = ({
  badge,
  frameName,
}: {
  badge: Badge;
  frameName: (frameId: string) => string;
}): ReactElement | null => {
  const { point } = badge;

  if (!point) {
    return null;
  }

  const where = point.label ?? frameName(point.frameId);

  return (
    <div
      className="mcp-point"
      role="status"
      data-tip={point.selector ? `${where}, ${point.selector}` : null}
      data-testid="mcp-point"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="mcp-point-avatar" aria-hidden="true">
        {authorInitial(point.client)}
      </span>
      <span className="mcp-point-text">
        <strong>{point.client}</strong>
        {copy.isPointingAt}
        <strong>{where}</strong>
      </span>
      <button type="button" className="btn small" onClick={badge.show}>
        {copy.show2}
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        onClick={badge.dismiss}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
};

export { McpPointBadge };
