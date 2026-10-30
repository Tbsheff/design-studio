export type ProjectType = 'next' | 'vite' | 'html' | 'react' | 'design-system';

export type HealthLevel = 'ok' | 'busy' | 'warn' | 'off';

export interface ProjectHealth {
  level: HealthLevel;
  note: string;
}

export interface ProjectHit {
  id: string;
  name: string;
  type: ProjectType;
  typeLabel: string;
  place: string | null;
  updatedAt: number;
  health: ProjectHealth | null;
  thumbnail: string | null;
}

export interface RouteHit {
  projectId: string;
  projectName: string;
  route: string;
  file: string;
  dynamic: boolean;
}

export interface ProjectSearchResult {
  query: string;
  projects: ProjectHit[];
  routes: RouteHit[];
}

export const TYPE_LABELS: Record<ProjectType, string> = {
  next: 'Next.js app',
  vite: 'Vite app',
  html: 'HTML',
  react: 'React',
  'design-system': 'Design system',
};
