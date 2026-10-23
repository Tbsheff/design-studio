import { useMemo, useState, type FormEvent } from 'react';
import type { Direction, Project, Version } from '../../shared/contracts';
import { displayTitle, indexVersions, type VersionIndex } from '../versionLabels';
import { Icon } from './Icon';
import { VersionRow } from './VersionRow';

interface Props {
  project: Project;
  directionId: string | null;
  versions: Version[];
  busy: boolean;
  running: boolean;
  compare: string[];
  openVersionId: string | null;
  onSelectDirection: (id: string) => void;
  onNewDirection: (fromVersionId: string, name: string) => Promise<void>;
  onOpen: (v: Version, title: string) => void;
  onRestore: (v: Version) => void;
  onUndo: () => void;
  onExport: (v: Version) => void;
  onToggleCompare: (v: Version) => void;
  onCompare: () => void;
  onPolish: () => void;
}

interface ForkFormProps {
  fromTitle: string;
  name: string;
  error: string | null;
  onName: (v: string) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

function ForkForm(props: ForkFormProps) {
  return (
    <form className="fork-form" onSubmit={props.onSubmit}>
      <div className="fork-from">Branch from {props.fromTitle}</div>
      <input autoFocus value={props.name} onChange={(e) => props.onName(e.target.value)} aria-label="Direction name" />
      {props.error && <div className="alert error">{props.error}</div>}
      <div className="row end">
        <button type="button" className="btn ghost small" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary small">
          Create direction
        </button>
      </div>
    </form>
  );
}

function DirectionItem({ dir, selected, onSelect }: { dir: Direction; selected: boolean; onSelect: () => void }) {
  return (
    <li>
      <button type="button" className={`list-item compact ${selected ? 'selected' : ''}`} aria-current={selected || undefined} onClick={onSelect}>
        <Icon name="branch" />
        <span className="name">{dir.name}</span>
        {selected && <Icon name="check" size={14} className="dir-current" />}
      </button>
    </li>
  );
}

function useFork(directionName: string | undefined, onNewDirection: Props['onNewDirection']) {
  const [from, setFrom] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const start = (versionId: string) => {
    setFrom(versionId);
    setName(`${directionName ?? 'Direction'} variant`);
    setError(null);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!from || !name.trim()) return;
    try {
      await onNewDirection(from, name.trim());
      setFrom(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  return { from, name, error, setName, start, cancel: () => setFrom(null), submit };
}

function titleOf(id: string, index: VersionIndex): string {
  const v = index.get(id);
  return v ? displayTitle(v, index) : id.slice(0, 7);
}

interface DirectionsProps {
  project: Project;
  directionId: string | null;
  headVersionId: string | null;
  index: VersionIndex;
  fork: ReturnType<typeof useFork>;
  onSelectDirection: (id: string) => void;
}

function DirectionsSection({ project, directionId, headVersionId, index, fork, onSelectDirection }: DirectionsProps) {
  return (
    <section className="panel-section dir-section" aria-labelledby="directions-heading">
      <div className="section-head">
        <h3 id="directions-heading">
          Directions <span className="count">{project.directions.length}</span>
        </h3>
        <button
          type="button"
          className="btn ghost small has-icon"
          disabled={!headVersionId}
          onClick={() => headVersionId && fork.start(headVersionId)}
        >
          <Icon name="plus" size={14} />
          New direction
        </button>
      </div>
      <ul className="list dir-list">
        {project.directions.map((dir) => (
          <DirectionItem key={dir.id} dir={dir} selected={dir.id === directionId} onSelect={() => onSelectDirection(dir.id)} />
        ))}
      </ul>
      {fork.from && (
        <ForkForm fromTitle={titleOf(fork.from, index)} name={fork.name} error={fork.error} onName={fork.setName} onCancel={fork.cancel} onSubmit={fork.submit} />
      )}
    </section>
  );
}

function VersionsHead(props: { count: number; comparing: boolean; canUndo: boolean; onCompare: () => void; onUndo: () => void }) {
  return (
    <div className="section-head">
      <h3 id="versions-heading">
        Versions <span className="count">{props.count}</span>
      </h3>
      <div className="section-actions">
        {props.comparing && (
          <button type="button" className="btn small primary has-icon" onClick={props.onCompare}>
            <Icon name="compare" size={14} />
            Compare
          </button>
        )}
        <button
          type="button"
          className="btn ghost small has-icon"
          aria-label="Undo"
          aria-keyshortcuts="Meta+Z Control+Z"
          data-tip="Undo the head version (⌘Z)"
          data-tip-align="end"
          onClick={props.onUndo}
          disabled={!props.canUndo}
        >
          <Icon name="undo" size={14} />
          Undo
        </button>
      </div>
    </div>
  );
}

function VersionsEmpty({ count, loading }: { count: number; loading: boolean }) {
  if (count > 0) return null;
  if (loading) {
    return (
      <div className="empty-note" role="status">
        Loading versions…
      </div>
    );
  }
  return <div className="empty-note">No versions yet. Send a prompt and the first run saves one here.</div>;
}

export function VersionsPanel(props: Props) {
  const { project, directionId, versions } = props;
  const direction = project.directions.find((x) => x.id === directionId) ?? null;
  const fork = useFork(direction?.name, props.onNewDirection);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = useMemo(() => [...versions].sort((a, b) => b.createdAt - a.createdAt), [versions]);
  const index = useMemo(() => indexVersions(versions), [versions]);
  const locked = props.busy || props.running;
  const headVersionId = direction?.headVersionId ?? null;

  return (
    <div className="versions-pane">
      <DirectionsSection project={project} directionId={directionId} headVersionId={headVersionId} index={index} fork={fork} onSelectDirection={props.onSelectDirection} />
      <section className="panel-section grow" aria-labelledby="versions-heading">
        <VersionsHead count={sorted.length} comparing={props.compare.length === 2} canUndo={!locked && sorted.length >= 2} onCompare={props.onCompare} onUndo={props.onUndo} />
        <VersionsEmpty count={sorted.length} loading={headVersionId !== null} />
        <ul className="list versions">
          {sorted.map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              index={index}
              isHead={v.id === headVersionId}
              isOpen={props.openVersionId === v.id}
              picked={props.compare.includes(v.id)}
              locked={locked}
              expanded={expanded === v.id}
              onExpand={() => setExpanded((cur) => (cur === v.id ? null : v.id))}
              onOpen={() => props.onOpen(v, displayTitle(v, index))}
              onOpenVersion={(target) => props.onOpen(target, displayTitle(target, index))}
              onRestore={() => props.onRestore(v)}
              onToggleCompare={() => props.onToggleCompare(v)}
              onExport={() => props.onExport(v)}
              onBranch={() => fork.start(v.id)}
              onPolish={props.onPolish}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
