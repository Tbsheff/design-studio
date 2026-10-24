import { useEffect, useMemo, useState } from 'react';
import type { ComponentInfo } from '../../shared/contracts';
import { componentThumb, type ComponentList } from '../useComponents';
import { Icon } from './Icon';

interface Props {
  projectId: string;
  directionId: string | null;
  list: ComponentList;
  onMention: (component: ComponentInfo) => void;
}

function Thumb({ projectId, directionId, component, version }: { projectId: string; directionId: string; component: ComponentInfo; version: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');
  useEffect(() => {
    let live = true;
    let url: string | null = null;
    if (!component.selector) {
      setState('none');
      return;
    }
    componentThumb(projectId, directionId, component.id, version).then(
      (next) => {
        url = next;
        if (!live) {
          if (next) URL.revokeObjectURL(next);
          return;
        }
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return next;
        });
        setState(next ? 'ready' : 'none');
      },
      () => live && setState('none'),
    );
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [projectId, directionId, component.id, component.selector, version]);
  return (
    <span className={`cmp-thumb ${state}`} aria-hidden="true">
      {src ? <img src={src} alt="" draggable={false} /> : state === 'none' ? <Icon name="component" size={20} /> : null}
    </span>
  );
}

function meta(component: ComponentInfo): string {
  const file = component.file?.split('/').pop() ?? '';
  const uses = component.uses === 1 ? '1 use' : `${component.uses} uses`;
  return file ? `${uses} · ${file}` : uses;
}

export function ComponentsPanel({ projectId, directionId, list, onMention }: Props) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (list.components ?? []).filter((item) => !needle || item.name.toLowerCase().includes(needle));
  }, [list.components, query]);
  const count = list.components?.length ?? 0;
  return (
    <div className="cmp">
      <div className="ins-header cmp-header">
        <strong className="cmp-title">Components</strong>
        {list.components && <span className="cmp-count">{count}</span>}
      </div>
      {count > 6 && (
        <div className="tk-search cmp-search">
          <Icon name="search" size={13} />
          <input type="search" aria-label="Filter components" placeholder="Filter components" value={query} spellCheck={false} onChange={(event) => setQuery(event.target.value)} />
        </div>
      )}
      <div className="ins-scroll cmp-scroll">
        {list.error && (
          <p className="ins-error" role="alert">
            <Icon name="alert" size={13} />
            Could not list components. {list.error}
          </p>
        )}
        {list.components === null && !list.error && (
          <ul className="cmp-grid" aria-busy="true" aria-label="Loading components">
            {[0, 1, 2, 3].map((key) => (
              <li key={key} className="cmp-skeleton" />
            ))}
          </ul>
        )}
        {list.components !== null && count === 0 && (
          <p className="ins-empty cmp-empty">No components yet. React components and parts the page repeats, like cards, show here.</p>
        )}
        {count > 0 && shown.length === 0 && <p className="ins-empty cmp-empty">No components match “{query}”.</p>}
        {directionId && shown.length > 0 && (
          <ul className="cmp-grid">
            {shown.map((component) => {
              return (
                <li key={component.id}>
                  <button
                    type="button"
                    className="cmp-card"
                    aria-label={`Mention ${component.name}`}
                    title={`Add @${component.name} to your message`}
                    data-testid="component-card"
                    onClick={() => onMention(component)}
                  >
                    <Thumb projectId={projectId} directionId={directionId} component={component} version={list.version} />
                    <span className="cmp-name truncate">{component.name}</span>
                    <span className="cmp-meta truncate">{meta(component)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {count > 0 && <p className="cmp-foot">Click a component to mention it in your message.</p>}
    </div>
  );
}
