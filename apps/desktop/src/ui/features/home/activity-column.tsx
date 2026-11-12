import type { ReactElement } from "react";

import { ActivityHead } from "./activity-head.js";
import { isActivityEmpty } from "./activity-model.js";
import { ActivitySection } from "./activity-section.js";
import { ApprovalItem } from "./approval-item.js";
import { copy } from "./copy.js";
import { RunItem } from "./run-item.js";
import { ServerItem } from "./server-item.js";
import type { ActivityState } from "./use-activity.js";
import { useDevServerToggle } from "./use-dev-server-toggle.js";

interface ActivityColumnProps {
  readonly onOpen: (projectId: string) => void;
  readonly onSearch: () => void;
  readonly state: ActivityState;
}

const ActivityColumn = ({
  onOpen,
  onSearch,
  state,
}: ActivityColumnProps): ReactElement | null => {
  const { activity, error, now } = state;
  const { isPending, onToggle } = useDevServerToggle();

  if (isActivityEmpty(activity, error !== null)) {
    return null;
  }

  const running = activity?.running ?? [];
  const approvals = activity?.approvals ?? [];
  const recent = activity?.recent ?? [];
  const servers = activity?.devServers ?? [];

  return (
    <aside className="ide-activity" aria-label={copy.activity}>
      <ActivityHead isOff={error !== null} />
      <ActivitySection
        count={running.length}
        empty={copy.nothingRunning}
        isEmpty={running.length === 0}
        title={copy.runningTitle}
      >
        {running.map((run) => (
          <RunItem key={run.id} now={now} onOpen={onOpen} run={run} />
        ))}
      </ActivitySection>
      <ActivitySection
        count={approvals.length}
        empty={copy.nothingWaiting}
        isEmpty={approvals.length === 0}
        title={copy.waitingOnYou}
      >
        {approvals.map((approval) => (
          <ApprovalItem
            key={approval.id}
            approval={approval}
            onOpen={onOpen}
            onSearch={onSearch}
          />
        ))}
      </ActivitySection>
      <ActivitySection
        count={null}
        empty={copy.noRecentRuns}
        isEmpty={recent.length === 0}
        title={copy.recentRuns}
      >
        {recent.map((run) => (
          <RunItem key={run.id} now={now} onOpen={onOpen} run={run} />
        ))}
      </ActivitySection>
      <ActivitySection
        count={null}
        empty={copy.noDevServers}
        isEmpty={servers.length === 0}
        title={copy.devServers}
      >
        {servers.map((entry) => (
          <ServerItem
            key={entry.projectId}
            isPending={isPending}
            onToggle={onToggle}
            server={entry}
          />
        ))}
      </ActivitySection>
    </aside>
  );
};

export { ActivityColumn };
