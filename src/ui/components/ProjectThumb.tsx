import { useEffect, useState } from 'react';
import type { ProjectHit, ProjectType } from '../../shared/project-search';
import { api } from '../api';
import { Icon, type IconName } from './Icon';
import '../styles/project-nav.css';

const cache = new Map<string, Promise<string>>();

const TYPE_ICON: Record<ProjectType, IconName> = { next: 'code', vite: 'code', html: 'file', react: 'react', 'design-system': 'palette' };

function useThumb(hit: ProjectHit): string | null {
  const key = hit.thumbnail ? `${hit.id}/${hit.thumbnail}` : null;
  const [url, setUrl] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!key || !hit.thumbnail) return;
    let live = true;
    let pending = cache.get(key);
    if (!pending) {
      pending = api.thumbnail(hit.id, hit.thumbnail).then((blob) => URL.createObjectURL(blob));
      pending.catch(() => cache.delete(key));
      cache.set(key, pending);
    }
    pending.then(
      (next) => live && setUrl({ key, url: next }),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [key, hit.id, hit.thumbnail]);
  return url && url.key === key ? url.url : null;
}

export function ProjectThumb({ hit, className }: { hit: ProjectHit; className?: string }) {
  const url = useThumb(hit);
  return (
    <span className={`pnav-thumb${className ? ` ${className}` : ''}`} data-type={hit.type} aria-hidden="true">
      {url ? <img src={url} alt="" draggable={false} /> : <Icon name={TYPE_ICON[hit.type]} size={12} />}
    </span>
  );
}

export function TypeBadge({ hit }: { hit: ProjectHit }) {
  return (
    <span className="badge pnav-badge" data-type={hit.type}>
      {hit.typeLabel}
    </span>
  );
}

export function HealthDot({ hit, className }: { hit: ProjectHit; className?: string }) {
  if (!hit.health) return null;
  return (
    <span className={`pnav-dot${className ? ` ${className}` : ''}`} data-level={hit.health.level} role="img" aria-label={hit.health.note} data-tip={hit.health.note} />
  );
}
