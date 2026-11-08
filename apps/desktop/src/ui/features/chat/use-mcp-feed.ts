import type {
  McpActivity,
  McpApprovalOutcome,
  McpApprovalRecord,
} from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

import { useProjectEvents } from "../../platform/events.js";
import { mcpApi } from "./mcp-model.js";
import type { RunView } from "./run-state-model.js";

interface McpApprovalCard {
  approval: McpApprovalRecord;
  outcome: McpApprovalOutcome | null;
}

interface McpFeedState {
  activity: McpActivity[];
  approvals: McpApprovalCard[];
}

const KEEP = 200;

const mergeActivity = (
  list: McpActivity[],
  add: McpActivity[]
): McpActivity[] => {
  const seen = new Set(list.map((item) => item.id));
  const fresh = add.filter((item) => !seen.has(item.id));

  if (fresh.length === 0) {
    return list;
  }

  return [...list, ...fresh]
    .toSorted((left, right) => left.at - right.at)
    .slice(-KEEP);
};

const replaceActivity = (
  list: McpActivity[],
  stored: McpActivity[]
): McpActivity[] => {
  const byId = new Map(stored.map((item) => [item.id, item]));

  return mergeActivity(
    list.map((item) => byId.get(item.id) ?? item),
    stored
  );
};

const addApproval = (
  list: McpApprovalCard[],
  approval: McpApprovalRecord
): McpApprovalCard[] => {
  if (list.some((card) => card.approval.id === approval.id)) {
    return list;
  }

  return [...list, { approval, outcome: null }];
};

const useMcpFeed = (
  projectId: string,
  directionId: string | null
): McpFeedState => {
  const [activity, setActivity] = useState<McpActivity[]>([]);
  const [approvals, setApprovals] = useState<McpApprovalCard[]>([]);

  const reload = useCallback(() => {
    let live = true;
    startTransition(async () => {
      try {
        const res = await mcpApi.activity(projectId);

        if (live) {
          setActivity((prev) => replaceActivity(prev, res.activity));
        }
      } catch {
        live = false;
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId]);

  useEffect(reload, [reload]);
  useProjectEvents(projectId, (event) => {
    if (event.type === "versions.changed") {
      reload();
    }

    if (event.type === "mcp.activity") {
      setActivity((prev) => mergeActivity(prev, [event.activity]));
    }

    if (event.type === "mcp.approval") {
      const { approval } = event;

      if (approval.expiresAt > Date.now()) {
        setApprovals((prev) => addApproval(prev, approval));
      }
    }

    if (event.type === "mcp.approval.resolved") {
      setApprovals((prev) =>
        prev.map((card) => {
          if (card.approval.id === event.approvalId) {
            return { ...card, outcome: event.outcome };
          }

          return card;
        })
      );
    }
  });

  const shown = useMemo(
    () =>
      activity.filter(
        (item) => item.directionId === null || item.directionId === directionId
      ),
    [activity, directionId]
  );

  return useMemo(() => ({ activity: shown, approvals }), [shown, approvals]);
};

type TimelineItem =
  | { kind: "run"; key: string; at: number; run: RunView }
  | {
      kind: "block";
      key: string;
      at: number;
      client: string;
      entries: McpActivity[];
    }
  | { kind: "approval"; key: string; at: number; card: McpApprovalCard };

interface McpFeedControl extends McpFeedState {
  locked: boolean;
  onUndo: (versionId: string) => void;
}

export { useMcpFeed };

export type { McpApprovalCard, McpFeedControl, McpFeedState, TimelineItem };
