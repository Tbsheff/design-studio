import type { StudioEvent } from '../shared/contracts.js';
import { DESKTOP_MESSAGE, type DesktopLinkMessage, type DesktopRunInfo } from '../shared/desktop-link.js';
import { RENDER_IPC_ENV } from '../shared/render-rpc.js';
import type { EventBus } from './types.js';

type Send = (message: DesktopLinkMessage) => void;

export function desktopSender(env: NodeJS.ProcessEnv = process.env): Send | null {
  if (env[RENDER_IPC_ENV] !== '1' || !process.send) return null;
  return (message) => {
    if (process.connected) process.send?.(message);
  };
}

function runMessage(event: StudioEvent, prompts: Map<string, string>): DesktopLinkMessage | null {
  if (event.type === 'mcp.approval') return { type: DESKTOP_MESSAGE, kind: 'mcp-approval', projectId: event.projectId, approvalId: event.approval.id, title: event.approval.title };
  if (event.type !== 'run.started' && event.type !== 'run.finished') return null;
  const directionId = event.directionId ?? '';
  if (event.type === 'run.started') {
    prompts.set(event.runId, event.request.prompt);
    return { type: DESKTOP_MESSAGE, kind: 'run-started', run: { runId: event.runId, projectId: event.projectId, directionId, prompt: event.request.prompt } };
  }
  const { summary } = event;
  const run: DesktopRunInfo = { runId: summary.id, projectId: summary.projectId, directionId: summary.directionId, prompt: summary.request.prompt || prompts.get(summary.id) || '' };
  prompts.delete(summary.id);
  return { type: DESKTOP_MESSAGE, kind: 'run-finished', run, status: summary.status, costUsd: summary.costUsd, error: summary.error };
}

export function linkDesktop(bus: EventBus, send: Send, hello: { token: string; dataDir: string }): EventBus {
  const prompts = new Map<string, string>();
  send({ type: DESKTOP_MESSAGE, kind: 'hello', ...hello });
  return {
    ...bus,
    emit(input) {
      const event = bus.emit(input);
      const message = runMessage(event, prompts);
      if (message) send(message);
      return event;
    },
  };
}
