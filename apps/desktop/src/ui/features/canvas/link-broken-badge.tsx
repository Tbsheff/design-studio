import { Icon } from "@design-studio/ui";
import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { toBrokenTip } from "./link-view.js";
import { protoCopy } from "./proto-copy.js";
import type { Box } from "./prototype-model.js";
import type { LinkState } from "./use-link-rects.js";

const BADGE_ICON = 11;

const toBadgeStyle = (box: Box | null): CSSProperties => {
  if (!box) {
    return {};
  }

  return { left: box.x + box.width, top: box.y };
};

interface LinkBrokenBadgeProps {
  readonly box: Box | null;
  readonly list: LinkState[];
}

const LinkBrokenBadge = ({
  box,
  list,
}: LinkBrokenBadgeProps): ReactElement | null => {
  const style = useMemo<CSSProperties>(() => toBadgeStyle(box), [box]);

  if (!box) {
    return null;
  }

  return (
    <span
      className="link-broken-badge"
      data-testid="link-broken"
      style={style}
      data-tip={toBrokenTip(list)}
    >
      <Icon name="unlink" size={BADGE_ICON} />
      {list.length} {protoCopy.broken}
    </span>
  );
};

export { LinkBrokenBadge };
