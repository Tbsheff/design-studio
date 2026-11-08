import { Icon } from "@design-studio/ui";
import type { PointerEvent, ReactElement } from "react";

import type { McpPointBadge as Badge } from "../canvas/use-canvas-point.js";
import { authorInitial } from "../comments/comment-avatar.js";
import { copy } from "./copy.js";

const stopPropagation = (event: PointerEvent<HTMLElement>): void =>
  event.stopPropagation();

const McpPointBadge = ({
  badge,
  frameName,
}: {
  badge: Badge;
  frameName: (frameId: string) => string;
}): ReactElement | null => {
  const { dismiss: handleDismiss, point, show: handleShow } = badge;

  if (!point) {
    return null;
  }

  const where = point.label ?? frameName(point.frameId);
  let tip: string | null = null;

  if (point.selector) {
    tip = `${where}, ${point.selector}`;
  }

  return (
    <output
      className="mcp-point"
      data-tip={tip}
      data-testid="mcp-point"
      onPointerDown={stopPropagation}
    >
      <span className="mcp-point-avatar" aria-hidden="true">
        {authorInitial(point.client)}
      </span>
      <span className="mcp-point-text">
        <strong>{point.client}</strong>
        {copy.isPointingAt}
        <strong>{where}</strong>
      </span>
      <button type="button" className="btn small" onClick={handleShow}>
        {copy.show2}
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        onClick={handleDismiss}
      >
        <Icon name="close" size={14} />
      </button>
    </output>
  );
};

export { McpPointBadge };
