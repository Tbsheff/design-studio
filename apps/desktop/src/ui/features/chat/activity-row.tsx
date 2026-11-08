import type { McpActivity } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { formatTime } from "../../domain/format.js";
import { ActivityUndo } from "./activity-undo.js";
import { toToolIcon } from "./mcp-feed-model.js";

const toBeforeVersion = (entry: McpActivity): string | null => {
  if (entry.versionId) {
    return entry.beforeVersionId;
  }

  return null;
};

const ActivityRow = ({
  entry,
  locked,
  onUndo,
  readOnly,
}: {
  entry: McpActivity;
  locked: boolean;
  onUndo: (versionId: string) => void;
  readOnly: boolean;
}): ReactElement => {
  const [isUndone, setIsUndone] = useState(false);
  const before = toBeforeVersion(entry);

  const markUndone = useCallback(
    (versionId: string): void => {
      setIsUndone(true);
      onUndo(versionId);
    },
    [onUndo]
  );

  return (
    <li className="mcp-row" data-testid="mcp-row" data-tool={entry.tool}>
      <span className="mcp-row-icon" aria-hidden="true">
        <Icon name={toToolIcon(entry.tool, "sparkle")} size={14} />
      </span>
      <span className="mcp-row-text" data-tip={entry.summary}>
        {entry.summary}
      </span>
      {before && !readOnly && (
        <ActivityUndo
          before={before}
          isLocked={locked}
          isUndone={isUndone}
          onUndo={markUndone}
        />
      )}
      <time
        className="mcp-row-time"
        dateTime={new Date(entry.at).toISOString()}
      >
        {formatTime(entry.at)}
      </time>
    </li>
  );
};

export { ActivityRow };
