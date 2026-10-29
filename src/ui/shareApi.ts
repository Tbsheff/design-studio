import type { ExportFrame } from '../shared/export';
import type { ShareCreated, ShareExpiryHours, ShareLink, ShareList, ShareServerState } from '../shared/share';
import { json } from './api';

export const SHARES_CHANGED = 'studio:shares-changed';

export function sharesChanged(projectId: string): void {
  window.dispatchEvent(new CustomEvent(SHARES_CHANGED, { detail: { projectId } }));
}

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}/shares`;

export const shareApi = {
  list: (pid: string) => json<ShareList>('GET', base(pid)),
  create: (pid: string, input: { directionId: string | null; versionId: string; frames: ExportFrame[]; frameIds: string[]; expiresInHours: ShareExpiryHours; live: boolean }) =>
    json<ShareCreated>('POST', base(pid), { ...input, directionId: input.directionId ?? undefined }),
  revoke: (pid: string, id: string) => json<{ link: ShareLink | null; server: ShareServerState }>('DELETE', `${base(pid)}/${encodeURIComponent(id)}`),
  setStudioCursor: (pid: string, id: string, on: boolean) => json<{ link: ShareLink }>('PUT', `${base(pid)}/${encodeURIComponent(id)}`, { studioCursor: on }),
  setLan: (on: boolean) => json<{ server: ShareServerState }>('PUT', '/api/shares/lan', { on }),
};
