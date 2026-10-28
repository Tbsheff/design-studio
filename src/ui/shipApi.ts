import type { ShipPrepare, ShipRequest, ShipResult, ShipSettings } from '../shared/ship';
import { json } from './api';

const base = (pid: string) => `/api/projects/${encodeURIComponent(pid)}/ship`;

export const shipApi = {
  prepare: (pid: string, baseVersionId?: string) => json<ShipPrepare>('GET', `${base(pid)}${baseVersionId ? `?base=${encodeURIComponent(baseVersionId)}` : ''}`),
  ship: (pid: string, request: ShipRequest) => json<ShipResult>('POST', base(pid), request),
  settings: (pid: string) => json<ShipSettings>('GET', `${base(pid)}/settings`),
  saveSettings: (pid: string, settings: ShipSettings) => json<ShipSettings>('PUT', `${base(pid)}/settings`, settings),
};
