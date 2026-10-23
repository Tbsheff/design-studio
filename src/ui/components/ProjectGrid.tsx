import type { PackSummary, Project } from '../../shared/contracts';
import { findPack, keySwatches } from '../packs';
import { Swatches } from './Swatches';
import { formatRelative, formatTime } from '../format';
import { Icon } from './Icon';

function ProjectCard({ project, pack, onOpen }: { project: Project; pack: PackSummary | null; onOpen: () => void }) {
  const html = project.kind === 'html';
  const count = project.directions.length;
  return (
    <button className="project-card" onClick={onOpen}>
      <span className="project-top">
        <span className={`project-glyph ${project.kind}`} aria-hidden="true">
          <Icon name={html ? 'code' : 'react'} size={18} />
        </span>
        <time className="project-time" dateTime={new Date(project.updatedAt).toISOString()} title={formatTime(project.updatedAt)}>
          {formatRelative(project.updatedAt)}
        </time>
      </span>
      <span className="project-name">{project.name}</span>
      <span className="project-meta">
        <span className="badge">{html ? 'HTML' : 'React + Vite'}</span>
        <span className="truncate">
          {count} direction{count === 1 ? '' : 's'}
        </span>
        {pack && (
          <span className="project-pack" title={`Design system: ${pack.name}`}>
            <Swatches swatches={keySwatches(pack)} max={4} size="sm" />
            <span className="sr-only">Design system: {pack.name}</span>
          </span>
        )}
      </span>
    </button>
  );
}

interface Props {
  projects: Project[] | null;
  packs: PackSummary[] | null;
  error: string | null;
  onOpen: (projectId: string) => void;
  filter?: { label: string; onClear: () => void } | null;
}

export function ProjectGrid({ projects, packs, error, onOpen, filter = null }: Props) {
  return (
    <section className="home-list" aria-labelledby="projects-heading">
      <div className="home-list-head">
        <h2 id="projects-heading">{filter ? `Projects in ${filter.label}` : 'Recent projects'}</h2>
        {projects && projects.length > 0 && <span className="count">{projects.length}</span>}
        {filter && (
          <button type="button" className="link home-list-clear" onClick={filter.onClear}>
            Show all
          </button>
        )}
      </div>
      {error && <div className="alert error">{error}</div>}
      {projects === null && !error && (
        <div className="project-grid" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="project-card skeleton" />
          ))}
        </div>
      )}
      {filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={18} />
          <span>No projects in {filter.label} yet. Use New project here or Open folder here.</span>
        </div>
      )}
      {!filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={18} />
          <span>No projects yet. Describe a design above, or open a folder that already holds one.</span>
        </div>
      )}
      {projects && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} pack={findPack(packs, p.packId)} onOpen={() => onOpen(p.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
