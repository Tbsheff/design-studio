import { STUDIO_TOKEN_HEADER } from '../shared/contracts';
import { EXPORT_NOTE_HEADER, type CopyCodeRequest, type CopyCodeResult, type EditorId, type EditorInfo, type ExportFormat, type ExportFrame, type ExportRequest, type ExportScale, type ExportScope, type HandoffRequest, type HandoffResult, type McpStatus } from '../shared/export';
import { activeFrame, canvasStore, defaultLayout, frameName, type CanvasFrame } from './canvasFrames';
import { getSession } from './session';
import { uiStore } from './storage';

const p = (pid: string) => `/api/projects/${encodeURIComponent(pid)}`;
const PREFS_KEY = 'design-studio.export.v1';
const OPEN_EVENT = 'studio:open-export';

async function call(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { [STUDIO_TOKEN_HEADER]: getSession().token };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(path, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(parsed?.error ?? `${res.status} ${res.statusText}`);
  }
  return res;
}

function fileName(res: Response, fallback: string): string {
  const match = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '');
  return match?.[1] ?? fallback;
}

export interface ExportedFile {
  blob: Blob;
  name: string;
  note: string | null;
}

export const exportApi = {
  exportFile: async (pid: string, request: ExportRequest): Promise<ExportedFile> => {
    const res = await call('POST', `${p(pid)}/export`, request);
    return { blob: await res.blob(), name: fileName(res, `export.${request.format}`), note: res.headers.get(EXPORT_NOTE_HEADER) };
  },
  handoff: async (pid: string, request: HandoffRequest): Promise<HandoffResult> => (await call('POST', `${p(pid)}/handoff`, request)).json() as Promise<HandoffResult>,
  handoffZip: async (pid: string, folder: string): Promise<ExportedFile> => {
    const res = await call('GET', `${p(pid)}/handoff/${encodeURIComponent(folder)}/zip`);
    return { blob: await res.blob(), name: fileName(res, `${folder}.zip`), note: null };
  },
  revealHandoff: async (pid: string, folder: string): Promise<void> => {
    await call('POST', `${p(pid)}/handoff/${encodeURIComponent(folder)}/reveal`);
  },
  copyCode: async (pid: string, request: CopyCodeRequest): Promise<CopyCodeResult> => (await call('POST', `${p(pid)}/copy-code`, request)).json() as Promise<CopyCodeResult>,
  editors: async (): Promise<EditorInfo[]> => (await call('GET', '/api/editors')).json() as Promise<EditorInfo[]>,
  openInEditor: async (pid: string, did: string, editor: EditorId): Promise<void> => {
    await call('POST', `${p(pid)}/d/${encodeURIComponent(did)}/open-in-editor`, { editor });
  },
  mcpStatus: async (): Promise<McpStatus> => (await call('GET', '/api/mcp')).json() as Promise<McpStatus>,
  setMcp: async (input: { enabled?: boolean; rotate?: boolean }): Promise<McpStatus> => (await call('POST', '/api/mcp', input)).json() as Promise<McpStatus>,
};

export interface ExportPrefs {
  format: ExportFormat;
  scale: ExportScale;
  scope: ExportScope;
}

const DEFAULT_PREFS: ExportPrefs = { format: 'png', scale: 2, scope: 'page' };
const FORMATS: ExportFormat[] = ['png', 'pdf', 'html', 'zip', 'handoff'];

export function readExportPrefs(): ExportPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<ExportPrefs>;
    return {
      format: FORMATS.includes(raw.format as ExportFormat) ? (raw.format as ExportFormat) : DEFAULT_PREFS.format,
      scale: raw.scale === 1 || raw.scale === 2 || raw.scale === 3 ? raw.scale : DEFAULT_PREFS.scale,
      scope: raw.scope === 'frame' ? 'frame' : 'page',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveExportPrefs(prefs: ExportPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    void 0;
  }
}

export interface FrameChoice {
  id: string;
  frame: ExportFrame;
  active: boolean;
}

function toExport(frame: CanvasFrame): ExportFrame {
  return { name: frameName(frame), width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}) };
}

export function canvasFrameChoices(projectId: string, directionId: string | null): FrameChoice[] {
  const layout = canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);
  const active = activeFrame(layout);
  const own = layout.frames.filter((frame) => !frame.directionId || frame.directionId === directionId);
  const list = own.length > 0 ? own : [active];
  return list.map((frame) => ({ id: frame.id, frame: toExport(frame), active: frame.id === active.id }));
}

export function activeExportFrame(projectId: string): ExportFrame {
  return toExport(activeFrame(canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport)));
}

export interface ExportTarget {
  projectId: string;
  directionId: string | null;
  versionId: string;
  versionLabel: string;
  selector?: string;
  format?: ExportFormat;
}

export interface OpenExportDetail {
  versionId?: string;
  format?: ExportFormat;
  selector?: string;
}

export function openExport(detail: OpenExportDetail = {}): void {
  window.dispatchEvent(new CustomEvent<OpenExportDetail>(OPEN_EVENT, { detail }));
}

export function onOpenExport(handler: (detail: OpenExportDetail) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<OpenExportDetail>).detail ?? {});
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

interface RevealBridge {
  revealExport?: () => void;
}

export function canRevealDownload(): boolean {
  return typeof (window as unknown as { studioDesktop?: RevealBridge }).studioDesktop?.revealExport === 'function';
}

export function revealDownload(): void {
  (window as unknown as { studioDesktop?: RevealBridge }).studioDesktop?.revealExport?.();
}
