import { useEffect, useState } from 'react';
import { STUDIO_TOKEN_HEADER } from '../shared/contracts';
import type { McpApproval, McpApprovalPoll } from '../shared/export';
import { getSession } from './session';

export const MCP_WAKE_EVENT = 'studio:mcp-control';
const IDLE_MS = 30_000;
const RETRY_MS = 3_000;

const headers = () => ({ [STUDIO_TOKEN_HEADER]: getSession().token });

export async function answerMcpApproval(id: string, allow: boolean): Promise<void> {
  const res = await fetch(`/api/mcp/approvals/${encodeURIComponent(id)}`, { method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify({ allow }) });
  if (!res.ok && res.status !== 404) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `${res.status}`);
}

export function useMcpApprovals(): McpApproval[] {
  const [pending, setPending] = useState<McpApproval[]>([]);
  useEffect(() => {
    let live = true;
    let wake: (() => void) | null = null;
    const abort = new AbortController();
    const onWake = () => wake?.();
    const pause = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          wake = null;
          resolve();
        }, ms);
        wake = () => {
          window.clearTimeout(timer);
          wake = null;
          resolve();
        };
      });
    window.addEventListener(MCP_WAKE_EVENT, onWake);
    void (async () => {
      let seen = '';
      while (live) {
        try {
          const res = await fetch(`/api/mcp/approvals?wait=25&seen=${encodeURIComponent(seen)}`, { headers: headers(), signal: abort.signal });
          if (!res.ok) throw new Error(`${res.status}`);
          const data = (await res.json()) as McpApprovalPoll;
          if (!live) return;
          seen = data.pending.map((item) => item.id).join(',');
          setPending(data.pending);
          if (!data.control) await pause(IDLE_MS);
        } catch {
          if (live) await pause(RETRY_MS);
        }
      }
    })();
    return () => {
      live = false;
      abort.abort();
      window.removeEventListener(MCP_WAKE_EVENT, onWake);
      wake?.();
    };
  }, []);
  return pending;
}
