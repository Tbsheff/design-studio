import type { ExportFrame } from '../shared/export';
import type { ShareCreated, ShareExpiryHours, ShareLink, ShareList, ShareServerState } from '../shared/share';
import { json } from './api';

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}/shares`;

export const shareApi = {
  list: (pid: string) => json<ShareList>('GET', base(pid)),
  create: (pid: string, input: { directionId: string | null; versionId: string; frames: ExportFrame[]; expiresInHours: ShareExpiryHours }) =>
    json<ShareCreated>('POST', base(pid), { ...input, directionId: input.directionId ?? undefined }),
  revoke: (pid: string, id: string) => json<{ link: ShareLink | null; server: ShareServerState }>('DELETE', `${base(pid)}/${encodeURIComponent(id)}`),
  setLan: (on: boolean) => json<{ server: ShareServerState }>('PUT', '/api/shares/lan', { on }),
};
