import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { RunTone } from "./activity-model.js";
import { copy } from "./copy.js";
import { toDataFlag } from "./data-flag-model.js";

type BadgeKind = RunTone | "approval" | "live" | "idle";

const BADGE_ICON = 10;

const toBadgeIcon = (kind: "failed" | "off"): "alert" | "stop" => {
  if (kind === "failed") {
    return "alert";
  }

  return "stop";
};

const ItemBadge = ({ kind }: { readonly kind: BadgeKind }): ReactElement => {
  if (kind === "running") {
    return <span className="ide-spin" />;
  }

  if (kind === "live" || kind === "idle") {
    return <span className="ide-dot" data-live={toDataFlag(kind === "live")} />;
  }

  if (kind === "approval") {
    return (
      <span className="ide-badge" data-tone="warn">
        {copy.bang}
      </span>
    );
  }

  if (kind === "ok") {
    return (
      <span className="ide-badge" data-tone="ok">
        <Icon name="check" size={BADGE_ICON} />
      </span>
    );
  }

  return (
    <span className="ide-badge" data-tone={kind}>
      <Icon name={toBadgeIcon(kind)} size={BADGE_ICON} />
    </span>
  );
};

export { ItemBadge };

export type { BadgeKind };
