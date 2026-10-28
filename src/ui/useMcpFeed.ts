import { useCallback, useEffect, useMemo, useState } from 'react';
import type { McpActivity, McpApprovalOutcome, McpApprovalRecord } from '../shared/contracts';
import { useProjectEvents } from './events';
import { mcpApi } from './mcpApi';

export interface McpApprovalCard {
  approval: McpApprovalRecord;
  outcome: McpApprovalOutcome | null;
}

export interface McpFeedState {
  activity: McpActivity[];
  approvals: McpApprovalCard[];
}

const KEEP = 200;

function mergeActivity(list: McpActivity[], add: McpActivity[]): McpActivity[] {
  const seen = new Set(list.map((item) => item.id));
  const fresh = add.filter((item) => !seen.has(item.id));
  if (fresh.length === 0) return list;
  return [...list, ...fresh].sort((a, b) => a.at - b.at).slice(-KEEP);
}

function replaceActivity(list: McpActivity[], stored: McpActivity[]): McpActivity[] {
  const byId = new Map(stored.map((item) => [item.id, item]));
  return mergeActivity(list.map((item) => byId.get(item.id) ?? item), stored);
}

export function useMcpFeed(projectId: string, directionId: string | null): McpFeedState {
  const [activity, setActivity] = useState<McpActivity[]>([]);
  const [approvals, setApprovals] = useState<McpApprovalCard[]>([]);
  const reload = useCallback(() => {
    let live = true;
    mcpApi
      .activity(projectId)
      .then((res) => live && setActivity((prev) => replaceActivity(prev, res.activity)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [projectId]);
  useEffect(reload, [reload]);
  useProjectEvents(projectId, (event) => {
    if (event.type === 'versions.changed') reload();
    else if (event.type === 'mcp.activity') setActivity((prev) => mergeActivity(prev, [event.activity]));
    else if (event.type === 'mcp.approval') {
      const { approval } = event;
      if (approval.expiresAt <= Date.now()) return;
      setApprovals((prev) => (prev.some((card) => card.approval.id === approval.id) ? prev : [...prev, { approval, outcome: null }]));
    } else if (event.type === 'mcp.approval.resolved') {
      setApprovals((prev) => prev.map((card) => (card.approval.id === event.approvalId ? { ...card, outcome: event.outcome } : card)));
    }
  });
  const shown = useMemo(() => activity.filter((item) => item.directionId === null || item.directionId === directionId), [activity, directionId]);
  return useMemo(() => ({ activity: shown, approvals }), [shown, approvals]);
}
