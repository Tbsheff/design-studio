import type { RunStatus, ZoomKey } from './contracts.js';

export const DESKTOP_MESSAGE = 'studio-desktop';

export interface DesktopRunInfo {
  runId: string;
  projectId: string;
  directionId: string;
  prompt: string;
}

export type DesktopLinkMessage =
  | { type: typeof DESKTOP_MESSAGE; kind: 'hello'; token: string; dataDir: string }
  | { type: typeof DESKTOP_MESSAGE; kind: 'run-started'; run: DesktopRunInfo }
  | { type: typeof DESKTOP_MESSAGE; kind: 'run-finished'; run: DesktopRunInfo; status: RunStatus; costUsd: number; error: string | null }
  | { type: typeof DESKTOP_MESSAGE; kind: 'mcp-approval'; projectId: string; approvalId: string; title: string };

export function isDesktopLinkMessage(value: unknown): value is DesktopLinkMessage {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { type?: unknown; kind?: unknown };
  return record.type === DESKTOP_MESSAGE && (record.kind === 'hello' || record.kind === 'run-started' || record.kind === 'run-finished' || record.kind === 'mcp-approval');
}

export type DesktopCommand =
  | { type: 'new-project' }
  | { type: 'open-folder'; path: string }
  | { type: 'open-project'; projectId: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'run' }
  | { type: 'stop' }
  | { type: 'zoom'; key: ZoomKey }
  | { type: 'command'; id: string };

const COMMAND_ID = /^[a-z][a-z0-9.-]{0,63}$/;

export function isCommandId(value: unknown): value is string {
  return typeof value === 'string' && COMMAND_ID.test(value);
}

export interface DesktopContext {
  projectId: string | null;
  directionId: string | null;
  running: boolean;
}

export const DESKTOP_IPC = {
  command: 'studio:command',
  context: 'studio:context',
  pickFolder: 'studio:pick-folder',
  revealExport: 'studio:reveal-export',
  dropFolder: 'studio:drop-folder',
} as const;

const MAX_PICK_TITLE = 200;
const MAX_PICK_PATH = 4096;

export function parseDroppedPath(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && value.length <= MAX_PICK_PATH && !value.includes('\0') ? value : null;
}

interface PickFolderRequest {
  title: string;
  defaultPath: string | null;
}

export function parsePickFolderRequest(value: unknown): PickFolderRequest | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.title !== undefined && typeof record.title !== 'string') return null;
  if (record.defaultPath !== undefined && record.defaultPath !== null && typeof record.defaultPath !== 'string') return null;
  const title = (typeof record.title === 'string' ? record.title : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_PICK_TITLE) || 'Choose a folder';
  const raw = typeof record.defaultPath === 'string' ? record.defaultPath : '';
  const defaultPath = raw.startsWith('/') && raw.length <= MAX_PICK_PATH && !raw.includes('\0') ? raw : null;
  return { title, defaultPath };
}

const PROJECT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isProjectId(value: unknown): value is string {
  return typeof value === 'string' && PROJECT_ID.test(value);
}

export function parseDeepLink(raw: string): DesktopCommand | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'designstudio:') return null;
  const action = url.hostname || url.pathname.replace(/^\/+/, '');
  if (action === 'open') {
    const projectId = url.searchParams.get('project');
    return isProjectId(projectId) ? { type: 'open-project', projectId } : null;
  }
  if (action === 'new') return { type: 'new-project' };
  return null;
}

export function isDesktopContext(value: unknown): value is DesktopContext {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<DesktopContext>;
  const idOrNull = (id: unknown) => id === null || isProjectId(id);
  return idOrNull(record.projectId) && idOrNull(record.directionId) && typeof record.running === 'boolean';
}
