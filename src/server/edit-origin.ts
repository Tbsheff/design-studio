import { AsyncLocalStorage } from 'node:async_hooks';
import type { VersionMeta } from '../shared/contracts.js';

interface EditOrigin {
  client: string;
}

const store = new AsyncLocalStorage<EditOrigin>();

export function withMcpOrigin<T>(client: string, task: () => Promise<T>): Promise<T> {
  return store.run({ client }, task);
}

export function stampOrigin<T extends VersionMeta>(meta: T): T {
  const origin = store.getStore();
  if (!origin || meta.origin) return meta;
  return { ...meta, origin: 'mcp', client: origin.client };
}

export function isOwnEdit(meta: VersionMeta): boolean {
  return meta.kind === 'manual' && meta.origin === undefined;
}

export function isOutsideEdit(meta: VersionMeta): boolean {
  return meta.origin === 'mcp' || meta.kind === 'run';
}
