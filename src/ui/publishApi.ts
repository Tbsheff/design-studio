import type { Publication, PublicationComment, PublicationList, PublishBackendMode, PublishBackendState, PublishCliState, PublishPlan, PublishPlanInput } from '../shared/publish';
import { json } from './api';

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;
const pub = (pid: string, id: string) => `${base(pid)}/publications/${encodeURIComponent(id)}`;

export const publishApi = {
  cli: (fresh = false) => json<PublishCliState>('GET', `/api/publish/cli${fresh ? '?fresh=1' : ''}`),
  login: (keyring: boolean, narrow: boolean) => json<PublishCliState>('POST', '/api/publish/login', { keyring, narrow }),
  cancelLogin: () => json<PublishCliState>('DELETE', '/api/publish/login'),
  logout: () => json<PublishCliState>('POST', '/api/publish/logout', {}),
  setAccount: (accountId: string | null) => json<PublishCliState>('PUT', '/api/publish/settings', { accountId }),
  backend: (check = false) => json<PublishBackendState>('GET', `/api/publish/backend${check ? '?check=1' : ''}`),
  setup: (mode: PublishBackendMode) => json<PublishBackendState>('POST', '/api/publish/backend/setup', { mode }),
  list: (pid: string) => json<PublicationList>('GET', `${base(pid)}/publications`),
  plan: (pid: string, input: PublishPlanInput) => json<PublishPlan>('POST', `${base(pid)}/publish/plan`, input),
  publish: (pid: string, planId: string) => json<{ publication: Publication }>('POST', `${base(pid)}/publish`, { planId }),
  unpublish: (pid: string, id: string) => json<{ publication: Publication }>('DELETE', pub(pid, id)),
  rollback: (pid: string, id: string, versionId: string) => json<{ publication: Publication }>('POST', `${pub(pid, id)}/rollback`, { versionId }),
  comments: (pid: string, id: string) => json<{ comments: PublicationComment[] }>('GET', `${pub(pid, id)}/comments`),
  deleteComment: (pid: string, id: string, cid: string) => json<{ ok: true }>('DELETE', `${pub(pid, id)}/comments/${encodeURIComponent(cid)}`),
};
