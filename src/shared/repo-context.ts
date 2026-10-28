export const REPO_CONTEXT_FILES = ['AGENTS.md', 'CLAUDE.md', 'DESIGN.md', 'PRODUCT.md'] as const;
export const REPO_CONTEXT_MAX_BYTES = 32768;

export type RepoContextScope = 'app' | 'workspace';
export type RepoContextUse = 'full' | 'cut' | 'design_md' | 'duplicate' | 'import_only' | 'too_large';

export interface RepoContextFile {
  path: string;
  scope: RepoContextScope;
  bytes: number;
  sentBytes: number;
  use: RepoContextUse;
  droppedLines: number;
}

export interface RepoContextState {
  workspaceRoot: string | null;
  appDir: string | null;
  files: RepoContextFile[];
  bytes: number;
  text: string | null;
}
