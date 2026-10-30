export type FoundAppKind = 'next' | 'vite' | 'html';

export interface FoundApp {
  path: string;
  name: string;
  kind: FoundAppKind;
  apps: string[];
  root: string;
  projectId: string | null;
}

export interface FoundApps {
  home: string;
  roots: string[];
  apps: FoundApp[];
  truncated: boolean;
  scannedAt: number;
}

export type AppHealthState = 'ready' | 'install' | 'building' | 'failed' | 'static';

export interface AppHealth {
  projectId: string;
  state: AppHealthState;
  title: string | null;
  detail: string | null;
  command: string | null;
}

export const FOUND_KIND_LABEL: Record<FoundAppKind, string> = { next: 'Next.js', vite: 'Vite', html: 'HTML' };
