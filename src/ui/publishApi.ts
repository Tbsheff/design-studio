import type { Publication, PublicationList, PublishCliState, PublishPlan, PublishPlanInput } from '../shared/publish';
import { json } from './api';

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;

export const publishApi = {
  cli: (fresh = false) => json<PublishCliState>('GET', `/api/publish/cli${fresh ? '?fresh=1' : ''}`),
  login: (keyring: boolean, narrow: boolean) => json<PublishCliState>('POST', '/api/publish/login', { keyring, narrow }),
  cancelLogin: () => json<PublishCliState>('DELETE', '/api/publish/login'),
  logout: () => json<PublishCliState>('POST', '/api/publish/logout', {}),
  setAccount: (accountId: string | null) => json<PublishCliState>('PUT', '/api/publish/settings', { accountId }),
  list: (pid: string) => json<PublicationList>('GET', `${base(pid)}/publications`),
  plan: (pid: string, input: PublishPlanInput) => json<PublishPlan>('POST', `${base(pid)}/publish/plan`, input),
  publish: (pid: string, planId: string) => json<{ publication: Publication }>('POST', `${base(pid)}/publish`, { planId }),
  unpublish: (pid: string, id: string) => json<{ publication: Publication }>('DELETE', `${base(pid)}/publications/${encodeURIComponent(id)}`),
};
