import type { PortFlowPlan, PortPlan, PortStartRequest, PortStartResult } from '../shared/port';
import { PORT_OPEN_EVENT } from '../shared/port';
import { json } from './api';

export interface PortOpenDetail {
  frameId: string | null;
  directionId: string | null;
}

let available = false;

export function setPortAvailable(on: boolean): void {
  available = on;
}

export function portAvailable(): boolean {
  return available;
}

export function openPortDialog(detail: PortOpenDetail): void {
  window.dispatchEvent(new CustomEvent<PortOpenDetail>(PORT_OPEN_EVENT, { detail }));
}

function planQuery(input: Omit<PortStartRequest, 'route'> & { route?: string }): string {
  const query = new URLSearchParams({ sourceProjectId: input.sourceProjectId, path: input.path, targetProjectId: input.targetProjectId });
  if (input.sourceDirectionId) query.set('sourceDirectionId', input.sourceDirectionId);
  if (input.route) query.set('route', input.route);
  return query.toString();
}

function flowQuery(input: Omit<PortStartRequest, 'route'> & { route?: string }): string {
  const query = new URLSearchParams(planQuery(input));
  query.set('flow', '1');
  return query.toString();
}

export const portApi = {
  plan: (input: Omit<PortStartRequest, 'route'> & { route?: string }) => json<PortPlan>('GET', `/api/port/plan?${planQuery(input)}`),
  flowPlan: (input: Omit<PortStartRequest, 'route'> & { route?: string }) => json<PortFlowPlan>('GET', `/api/port/plan?${flowQuery(input)}`),
  start: (input: PortStartRequest) => json<PortStartResult>('POST', '/api/port/start', input),
};
