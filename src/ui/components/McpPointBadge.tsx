import type { McpPointBadge as Badge } from '../useCanvasPoint';
import { authorInitial } from './CommentAvatar';
import { Icon } from './Icon';

export function McpPointBadge({ badge, frameName }: { badge: Badge; frameName: (frameId: string) => string }) {
  const { point } = badge;
  if (!point) return null;
  const where = point.label ?? frameName(point.frameId);
  return (
    <div className="mcp-point" role="status" data-testid="mcp-point" onPointerDown={(event) => event.stopPropagation()}>
      <span className="mcp-point-avatar" aria-hidden="true">
        {authorInitial(point.client)}
      </span>
      <span className="mcp-point-text" title={point.selector ? `${where}, ${point.selector}` : undefined}>
        <strong>{point.client}</strong> is pointing at <strong>{where}</strong>
      </span>
      <button type="button" className="btn small" onClick={badge.show}>
        Show
      </button>
      <button type="button" className="icon-btn small" aria-label="Dismiss" onClick={badge.dismiss}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
