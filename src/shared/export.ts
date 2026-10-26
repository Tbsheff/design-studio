export type ExportFormat = 'png' | 'pdf' | 'html' | 'zip' | 'handoff';
export type ExportScale = 1 | 2 | 3;
export type ExportScope = 'page' | 'frame';
export type CopyCodeFormat = 'html' | 'tailwind';
export type EditorId = 'cursor' | 'vscode' | 'zed';

export const EXPORT_SCALES: readonly ExportScale[] = [1, 2, 3];
export const EXPORT_MAX_FRAMES = 12;
export const EXPORT_FRAME_MAX_SIDE = 4000;
export const EXPORT_PATH_MAX = 200;

export interface ExportFrame {
  name: string;
  width: number;
  height: number;
  path?: string;
}

export interface ExportRequest {
  format: Exclude<ExportFormat, 'handoff'>;
  versionId: string;
  frames: ExportFrame[];
  scale: ExportScale;
  scope: ExportScope;
  selector?: string;
}

export interface HandoffRequest {
  versionId: string;
  frames: ExportFrame[];
}

export interface HandoffResult {
  path: string;
  files: string[];
  prompt: string;
  versionId: string;
}

export interface CopyCodeRequest {
  versionId?: string;
  directionId?: string;
  frame: ExportFrame;
  selector: string;
  format: CopyCodeFormat;
}

export interface CopyCodeResult {
  code: string;
  format: CopyCodeFormat;
}

export interface EditorInfo {
  id: EditorId;
  name: string;
}

export interface McpStatus {
  enabled: boolean;
  control: boolean;
  running: boolean;
  url: string | null;
  command: string | null;
  error: string | null;
}

export interface McpApproval {
  id: string;
  tool: string;
  title: string;
  detail: string;
  createdAt: number;
  expiresAt: number;
}

export interface McpApprovalPoll {
  control: boolean;
  pending: McpApproval[];
}

export const EXPORT_NOTE_HEADER = 'x-studio-export-note';

export function cleanExportPath(raw: string): string | null {
  const value = raw.trim().replace(/^\/+/, '');
  if (value === '') return '';
  if (value.length > EXPORT_PATH_MAX || /[\\\s#?:]|%2e|%2f|%5c/i.test(value)) return null;
  if (value.split('/').some((part) => part === '..' || part === '.')) return null;
  return value;
}

export function exportFileStem(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'design';
}
