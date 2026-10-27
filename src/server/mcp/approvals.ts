import { randomBytes } from 'node:crypto';
import type { McpApprovalOutcome, McpApprovalRecord } from '../../shared/contracts.js';

export interface ApprovalAsk {
  tool: string;
  action: string;
  title: string;
  detail: string;
  projectId: string | null;
  client: string;
}

export interface ApprovalEvents {
  opened(approval: McpApprovalRecord): void;
  resolved(approval: McpApprovalRecord, outcome: McpApprovalOutcome): void;
}

export interface ApprovalQueue {
  ask(input: ApprovalAsk): Promise<McpApprovalOutcome>;
  answer(id: string, allow: boolean): boolean;
  list(): McpApprovalRecord[];
  poll(seen: string, waitMs: number, signal?: AbortSignal): Promise<McpApprovalRecord[]>;
  windowOpen(): boolean;
}

interface Pending {
  approval: McpApprovalRecord;
  settle: (outcome: McpApprovalOutcome) => void;
}

interface QueueOptions {
  timeoutMs?: number;
  now?: () => number;
  appOpen?: () => boolean;
  events?: ApprovalEvents;
}

export const APPROVAL_TIMEOUT_MS = 120_000;
const POLL_GRACE_MS = 6_000;
const MAX_PENDING = 10;
const TEXT_MAX = { title: 200, detail: 600 };

export function approvalKey(list: readonly McpApprovalRecord[]): string {
  return list.map((item) => item.id).join(',');
}

function clean(text: string, max: number): string {
  const flat = text.replace(/[\p{Cc}\s]+/gu, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function createApprovalQueue(options: QueueOptions = {}): ApprovalQueue {
  const timeoutMs = options.timeoutMs ?? APPROVAL_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const pending = new Map<string, Pending>();
  const waiters = new Set<() => void>();
  let polls = 0;
  let lastPoll = 0;

  const changed = (): void => {
    for (const wake of [...waiters]) wake();
  };

  const list = (): McpApprovalRecord[] => [...pending.values()].map((item) => item.approval);

  const finish = (id: string, outcome: McpApprovalOutcome): boolean => {
    const item = pending.get(id);
    if (!item) return false;
    pending.delete(id);
    item.settle(outcome);
    options.events?.resolved(item.approval, outcome);
    changed();
    return true;
  };

  const windowOpen = (): boolean => polls > 0 || now() - lastPoll < POLL_GRACE_MS || options.appOpen?.() === true;

  return {
    ask(input) {
      if (!windowOpen()) return Promise.resolve('closed');
      if (pending.size >= MAX_PENDING) return Promise.resolve('deny');
      const id = randomBytes(9).toString('base64url');
      const createdAt = now();
      const approval: McpApprovalRecord = { id, tool: input.tool, action: input.action, title: clean(input.title, TEXT_MAX.title), detail: clean(input.detail, TEXT_MAX.detail), projectId: input.projectId, client: clean(input.client, 40), createdAt, expiresAt: createdAt + timeoutMs };
      return new Promise<McpApprovalOutcome>((resolve) => {
        const timer = setTimeout(() => finish(id, 'timeout'), timeoutMs);
        timer.unref?.();
        pending.set(id, {
          approval,
          settle: (outcome) => {
            clearTimeout(timer);
            resolve(outcome);
          },
        });
        options.events?.opened(approval);
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
