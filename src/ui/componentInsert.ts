import type { InsertComponentRequest, InsertComponentResult, InsertPosition, InsertableComponent, InsertableList } from '../shared/insert';
import { ApiError, json } from './api';

const d = (pid: string, did: string) => `/api/projects/${encodeURIComponent(pid)}/d/${encodeURIComponent(did)}`;

export const insertApi = {
  list: (pid: string, did: string) => json<InsertableList>('GET', `${d(pid, did)}/insert/components`),
  insert: (pid: string, did: string, request: InsertComponentRequest) => json<InsertComponentResult>('POST', `${d(pid, did)}/insert`, request),
};

export function insertError(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof (error.data as { message?: unknown }).message === 'string') return (error.data as { message: string }).message;
  return error instanceof Error ? error.message : String(error);
}

export interface DropHint {
  text: string;
  ok: boolean;
}

export interface InsertHost {
  insert(component: InsertableComponent, position: InsertPosition): void;
  dragMove(x: number, y: number, onHint: (hint: DropHint | null) => void): void;
  dragEnd(component: InsertableComponent, x: number, y: number): void;
}

let host: InsertHost | null = null;

export const insertBus = {
  set(next: InsertHost | null): void {
    host = next;
  },
  clear(owner: InsertHost): void {
    if (host === owner) host = null;
  },
  get: (): InsertHost | null => host,
};
