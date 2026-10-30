import { useEffect, useState } from 'react';
import type { Project, RunSummary } from '../../shared/contracts';
import type { AppHealth } from '../../shared/found-apps';
import { json } from '../api';
import { formatRelative } from '../format';
import { homePrefs, type HomeFilter } from '../homePrefs';
import { Icon } from './Icon';
import { isFolderProject, projectBadge, useThumbnail } from './ProjectGrid';

export { ProjectGrid } from './ProjectGrid';
export { PackCards } from './HomePopovers';

const FILTERS: { id: HomeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'prototypes', label: 'Prototypes' },
  { id: 'apps', label: 'Apps' },
  { id: 'systems', label: 'Systems' },
];

export const FILTER_EMPTY: Record<HomeFilter, string> = { all: 'projects', prototypes: 'prototypes', apps: 'apps', systems: 'design systems' };

export function filterLibrary(projects: Project[] | null, filter: HomeFilter): Project[] | null {
  if (!projects || filter === 'all' || filter === 'systems') return projects;
  return projects.filter((project) => isFolderProject(project) === (filter === 'apps'));
}

export function FilterChips({ filter }: { filter: HomeFilter }) {
  return (
    <div className="home-seg" role="tablist" aria-label="Show">
      {FILTERS.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? 'on' : ''} onClick={() => homePrefs.set({ filter: item.id })}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface LastRun {
  prompt: string;
  route: string | null;
  at: number;
}

function useLastRun(project: Project): LastRun | null {
  const [last, setLast] = useState<LastRun | null>(null);
  useEffect(() => {
    let live = true;
    json<{ runs: RunSummary[] }>('GET', `/api/projects/${encodeURIComponent(project.id)}/runs?limit=5&light=1`)
      .then(({ runs }) => {
        const run = [...runs].sort((a, b) => b.startedAt - a.startedAt)[0];
        if (live && run) setLast({ prompt: run.request.prompt, route: run.request.canvas?.path ?? null, at: run.startedAt });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [project.id]);
  return last;
}

function routeLine(project: Project, last: LastRun | null): string {
  const dir = project.app?.appDir && project.app.appDir !== '.' ? project.app.appDir : null;
  const route = last?.route ?? (project.app ? null : project.entry);
  return [dir, route].filter(Boolean).join(' · ');
}

const SERVER_TEXT: Partial<Record<AppHealth['state'], string>> = { ready: 'Dev server ready', building: 'Dev server starting…', install: 'Needs install', failed: 'Dev server failed' };

export function ContinueCard({ project, health, onOpen }: { project: Project; health: AppHealth | null; onOpen: (project: Project) => void }) {
  const thumb = useThumbnail(project);
  const last = useLastRun(project);
  const badge = projectBadge(project);
  const line = routeLine(project, last);
  const server = project.app && health ? SERVER_TEXT[health.state] : undefined;
  return (
    <section className="home-continue" aria-label="Continue">
      <button type="button" className="home-continue-thumb" tabIndex={-1} aria-hidden="true" onClick={() => onOpen(project)}>
        {thumb ? <img src={thumb} alt="" draggable={false} /> : <Icon name={project.app ? 'code' : 'frame'} size={20} />}
      </button>
      <div className="home-continue-body">
        <span className="home-continue-kicker">Continue</span>
        <div className="home-continue-title">
          <b className="truncate">{project.name}</b>
          <span className={`home-badge ${badge.tone}`}>{badge.label}</span>
          {line && <span className="mono truncate home-continue-route">{line}</span>}
        </div>
        <p className="home-continue-last truncate">{last ? `Last: “${last.prompt}” · ${formatRelative(last.at)}` : `Edited ${formatRelative(project.updatedAt).replace(/^Just/, 'just')}`}</p>
        <div className="home-continue-actions">
          <button type="button" className="btn primary" onClick={() => onOpen(project)}>
            Resume
            <Icon name="arrowRight" size={14} />
          </button>
          {server && health && (
            <span className={`project-health ${health.state}`}>
              <span className="project-dot" aria-hidden="true" />
              {server}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
