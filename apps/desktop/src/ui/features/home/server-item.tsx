import type { ReactElement } from "react";
import { useCallback } from "react";

import { ActivityItem } from "./activity-item.js";
import { isServerLive, toServerMeta } from "./activity-model.js";
import type { ActivityServerWire } from "./activity-model.js";
import { copy } from "./copy.js";
import type { BadgeKind } from "./item-badge.js";

interface ServerItemProps {
  readonly isPending: boolean;
  readonly onToggle: (projectId: string, isLive: boolean) => void;
  readonly server: ActivityServerWire;
}

const toButtonText = (isLive: boolean): string => {
  if (isLive) {
    return copy.stopServer;
  }

  return copy.startServer;
};

const toBadge = (isLive: boolean): BadgeKind => {
  if (isLive) {
    return "live";
  }

  return "idle";
};

const ServerItem = ({
  isPending,
  onToggle,
  server,
}: ServerItemProps): ReactElement => {
  const isLive = isServerLive(server);

  const handleToggle = useCallback((): void => {
    onToggle(server.projectId, isLive);
  }, [isLive, onToggle, server.projectId]);

  return (
    <ActivityItem
      badge={toBadge(isLive)}
      meta={toServerMeta(server)}
      onClick={null}
      title={server.projectName}
    >
      <button
        type="button"
        className="ide-mini"
        disabled={isPending}
        aria-label={`${toButtonText(isLive)} ${server.projectName}`}
        onClick={handleToggle}
      >
        {toButtonText(isLive)}
      </button>
    </ActivityItem>
  );
};

export { ServerItem };
