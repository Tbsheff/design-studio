import { randomBytes } from 'node:crypto';
import type { McpApproval } from '../../shared/export.js';

export type ApprovalOutcome = 'allow' | 'deny' | 'timeout' | 'closed';

export interface ApprovalAsk {
  tool: string;
  title: string;
  detail: string;
}

export interface ApprovalQueue {
  ask(input: ApprovalAsk): Promise<ApprovalOutcome>;
  answer(id: string, allow: boolean): boolean;
  list(): McpApproval[];
  poll(seen: string, waitMs: number, signal?: AbortSignal): Promise<McpApproval[]>;
  windowOpen(): boolean;
}

interface Pending {
  approval: McpApproval;
  settle: (outcome: ApprovalOutcome) => void;
}

export const APPROVAL_TIMEOUT_MS = 120_000;
const WINDOW_GRACE_MS = 6_000;
const MAX_PENDING = 10;

export function approvalKey(list: readonly McpApproval[]): string {
  return list.map((item) => item.id).join(',');
}

export function createApprovalQueue(options: { timeoutMs?: number; now?: () => number } = {}): ApprovalQueue {
  const timeoutMs = options.timeoutMs ?? APPROVAL_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const pending = new Map<string, Pending>();
  const waiters = new Set<() => void>();
  let polls = 0;
  let lastPoll = 0;

  const changed = (): void => {
    for (const wake of [...waiters]) wake();
  };

  const list = (): McpApproval[] => [...pending.values()].map((item) => item.approval);

  const finish = (id: string, outcome: ApprovalOutcome): boolean => {
    const item = pending.get(id);
    if (!item) return false;
    pending.delete(id);
    item.settle(outcome);
    changed();
    return true;
  };

  const windowOpen = (): boolean => polls > 0 || now() - lastPoll < WINDOW_GRACE_MS;

  return {
    ask(input) {
      if (!windowOpen()) return Promise.resolve('closed');
      if (pending.size >= MAX_PENDING) return Promise.resolve('deny');
      const id = randomBytes(9).toString('base64url');
      const createdAt = now();
      const approval: McpApproval = { id, tool: input.tool, title: input.title, detail: input.detail, createdAt, expiresAt: createdAt + timeoutMs };
      return new Promise<ApprovalOutcome>((resolve) => {
        const timer = setTimeout(() => finish(id, 'timeout'), timeoutMs);
        timer.unref?.();
        pending.set(id, {
          approval,
          settle: (outcome) => {
            clearTimeout(timer);
            resolve(outcome);
          },
        });
        changed();
      });
    },
    answer: (id, allow) => finish(id, allow ? 'allow' : 'deny'),
    list,
    async poll(seen, waitMs, signal) {
      polls += 1;
      lastPoll = now();
      try {
        if (approvalKey(list()) !== seen || waitMs <= 0) return list();
        await new Promise<void>((resolve) => {
          const done = (): void => {
            clearTimeout(timer);
            waiters.delete(done);
            signal?.removeEventListener('abort', done);
            resolve();
          };
          const timer = setTimeout(done, waitMs);
          waiters.add(done);
          signal?.addEventListener('abort', done);
        });
        return list();
      } finally {
        polls -= 1;
        lastPoll = now();
      }
    },
    windowOpen,
  };
}
