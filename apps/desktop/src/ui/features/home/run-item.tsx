import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { ActivityItem } from "./activity-item.js";
import { toRunMeta, toRunTone } from "./activity-model.js";
import type { ActivityRunWire } from "./activity-model.js";

interface RunItemProps {
  readonly now: number;
  readonly onOpen: (projectId: string) => void;
  readonly run: ActivityRunWire;
}

const ARROW_SIZE = 12;

const RunItem = ({ now, onOpen, run }: RunItemProps): ReactElement => {
  const handleOpen = useCallback((): void => {
    onOpen(run.projectId);
  }, [onOpen, run.projectId]);

  return (
    <ActivityItem
      badge={toRunTone(run)}
      meta={toRunMeta(run, now)}
      onClick={handleOpen}
      title={run.title}
    >
      <Icon name="arrowRight" size={ARROW_SIZE} />
    </ActivityItem>
  );
};

export { RunItem };
