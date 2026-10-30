import { useEffect, useState } from 'react';
import type { Starter } from '../../shared/contracts';
import { shortenHome } from '../../shared/folders';
import { FOUND_KIND_LABEL, type FoundApp, type FoundApps } from '../../shared/found-apps';
import { api } from '../api';
import { projectsApi } from '../projectsStore';
import { Icon } from './Icon';

const MAX_FOUND = 6;
const MAX_STARTERS = 4;
const KIND_TONE = { next: 'next', vite: 'vite', html: 'html' } as const;

function foundBadge(app: FoundApp): string {
  const base = FOUND_KIND_LABEL[app.kind];
  return app.kind === 'next' && app.apps.length > 1 ? `${base} monorepo` : base;
}

function useFound(): FoundApps | null | 'error' {
  const [found, setFound] = useState<FoundApps | null | 'error'>(null);
  useEffect(() => {
    let live = true;
    projectsApi
      .found()
      .then((next) => live && setFound(next))
      .catch(() => live && setFound('error'));
    return () => {
      live = false;
    };
  }, []);
  return found;
}

function FoundList({ onUse }: { onUse: (path: string) => void }) {
  const found = useFound();
  if (found === 'error') return null;
  const apps = found?.apps.slice(0, MAX_FOUND) ?? [];
  const roots = found ? found.roots.map((root) => shortenHome(root, found.home).replace(/^~\//, '')).join(', ') : '';
  return (
    <section className="home-found" aria-label="Found on this Mac">
      <div className="home-found-head">
        <span>Found on this Mac</span>
        <span className="spacer" />
        <span className="home-found-roots truncate">{roots}</span>
      </div>
      {found === null && <p className="home-found-note">Looking in your folders…</p>}
      {found && apps.length === 0 && <p className="home-found-note">No app folders found in {roots || 'your home folder'}. Use Add app folder, or drop a folder on the window.</p>}
      {apps.map((app) => (
        <div key={app.path} className="home-found-row">
          <span className="home-found-ic" aria-hidden="true">
            <Icon name="folder" size={14} />
          </span>
          <span className="home-found-name truncate">{app.name}</span>
          <span className="home-found-path truncate">{found ? shortenHome(app.path, found.home) : app.path}</span>
          <span className={`home-badge ${KIND_TONE[app.kind]}`}>{foundBadge(app)}</span>
          <button type="button" className="btn small" aria-label={`Use ${app.name}`} data-tip="Put this folder on the prompt" onClick={() => onUse(app.path)}>
            Use
          </button>
        </div>
      ))}
    </section>
  );
}

function StartCards({ busy, onSample, onStarter }: { busy: boolean; onSample: () => void; onStarter: (starter: Starter) => void }) {
  const [starters, setStarters] = useState<Starter[]>([]);
  useEffect(() => {
    void api
      .starters()
      .then((list) => setStarters(list.slice(0, MAX_STARTERS)))
      .catch(() => undefined);
  }, []);
  return (
    <div className="home-start">
      <button type="button" className="home-start-card sample" disabled={busy} onClick={onSample}>
        <span className="home-start-thumb" aria-hidden="true">
          <Icon name="play" size={16} />
        </span>
        <span className="home-start-text">
          <b>Open the sample</b>
          <span>Click through a finished prototype. No cost.</span>
        </span>
      </button>
      <div className="home-start-card">
        <b>Or start from</b>
        <div className="home-start-pills">
          {starters.map((starter) => (
            <button key={starter.id} type="button" className="home-pill" disabled={busy} onClick={() => onStarter(starter)}>
              {starter.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomeEmpty({ busy, onUse, onSample, onStarter }: { busy: boolean; onUse: (path: string) => void; onSample: () => void; onStarter: (starter: Starter) => void }) {
  return (
    <div className="home-empty-state">
      <div className="home-empty-grid">
        <FoundList onUse={onUse} />
        <StartCards busy={busy} onSample={onSample} onStarter={onStarter} />
      </div>
      <p className="home-empty-note">“Use” puts the folder on the prompt as context. Recent work shows here after your first project.</p>
    </div>
  );
}
