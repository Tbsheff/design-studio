import type { ComponentFolderList, CreateComponentRequest, CreateComponentResult, SwapCandidateList, SwapResult } from '../shared/component-create';
import type { SourceLoc } from '../shared/contracts';
import { ApiError, json } from './api';

const d = (pid: string, did: string) => `/api/projects/${encodeURIComponent(pid)}/d/${encodeURIComponent(did)}/components`;

export const componentCreateApi = {
  folders: (pid: string, did: string) => json<ComponentFolderList>('GET', `${d(pid, did)}/folders`),
  create: (pid: string, did: string, request: CreateComponentRequest) => json<CreateComponentResult>('POST', `${d(pid, did)}/create`, request),
  swapCandidates: (pid: string, did: string, use: SourceLoc) => json<SwapCandidateList>('POST', `${d(pid, did)}/swap-candidates`, { use }),
  swap: (pid: string, did: string, use: SourceLoc, component: { name: string; file: string }) => json<SwapResult>('POST', `${d(pid, did)}/swap`, { use, component }),
};

export function apiMessage(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof (error.data as { message?: unknown }).message === 'string') return (error.data as { message: string }).message;
  return error instanceof Error ? error.message : String(error);
}
