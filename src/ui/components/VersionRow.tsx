import { useRef, useState, type KeyboardEvent } from 'react';
import type { Version } from '../../shared/contracts';
import { formatRelative, formatTime } from '../format';
import { autoTitle, displayTitle, fullText, kindInfo, originOf, undoneOf, type VersionIndex } from '../versionLabels';
import { Icon, type IconName } from './Icon';
import { levelHint, levelLabel } from './LevelControl';
import { VersionThumb } from './VersionThumb';

const NAME_MAX = 80;

interface VersionRowProps {
  projectId: string;
  active: boolean;
  version: Version;
  index: VersionIndex;
  isHead: boolean;
  isOpen: boolean;
  picked: boolean;
  locked: boolean;
  expanded: boolean;
  onExpand: () => void;
  onOpen: () => void;
  onOpenVersion: (v: Version) => void;
  onRestore: () => void;
  onToggleCompare: () => void;
  onExport: () => void;
  onBranch: () => void;
  onPolish: () => void;
  onRename: (name: string | null) => void;
}

function RenameField({ initial, fallback, onDone }: { initial: string; fallback: string; onDone: (name: string | null | undefined) => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (name: string | null | undefined) => {
    if (done.current) return;
    done.current = true;
    onDone(name);
  };
  const commit = () => {
    const name = value.trim().replace(/\s+/g, ' ');
    if (name === initial) return finish(undefined);
    finish(name === '' || name === fallback ? null : name);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(undefined);
    }
  };
  return (
    <input
      className="version-rename"
      aria-label="Version name"
      autoFocus
      value={value}
      maxLength={NAME_MAX}
      placeholder={fallback}
      spellCheck={false}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={commit}
    />
  );
}

function RowAction(props: { label: string; icon: IconName; tip: string; onClick: () => void; disabled?: boolean; pressed?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={props.label}
      data-tip={props.tip}
      data-tip-side="top"
      data-tip-align="end"
      aria-pressed={props.pressed}
      data-testid={props.testId}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon name={props.icon} size={15} />
    </button>
  );
}

function VersionLink({ label, target, index, onOpen }: { label: string; target: Version; index: VersionIndex; onOpen: (v: Version) => void }) {
  return (
    <div className="version-fact">
      <dt>{label}</dt>
      <dd>
        <button type="button" className="link" onClick={() => onOpen(target)}>
          {displayTitle(target, index)}
        </button>
      </dd>
    </div>
  );
}

function VersionDetail({ version: v, index, id, onOpenVersion }: { version: Version; index: VersionIndex; id: string; onOpenVersion: (v: Version) => void }) {
  const prompt = fullText(v);
  const origin = originOf(v, index);
  const undone = undoneOf(v, index);
  return (
    <dl className="version-detail" id={id}>
      {prompt && (
        <div className="version-fact">
          <dt>{v.meta.kind === 'run' ? 'Prompt' : 'Change'}</dt>
          <dd className="version-prompt">{prompt}</dd>
        </div>
      )}
      {undone && <VersionLink label="Undid" target={undone} index={index} onOpen={onOpenVersion} />}
      {origin && <VersionLink label={v.meta.kind === 'undo' ? 'Back to' : 'Restored'} target={origin} index={index} onOpen={onOpenVersion} />}
      <div className="version-fact">
        <dt>Saved</dt>
        <dd>{formatTime(v.createdAt)}</dd>
      </div>
      {v.changedFiles.length > 0 && (
        <div className="version-fact">
          <dt>Files</dt>
          <dd className="version-files">
            {v.changedFiles.map((file) => (
              <code key={file}>{file}</code>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}

function VersionLevel({ version: v }: { version: Version }) {
  const level = v.meta.level;
  if (!level) return null;
  return (
    <>
      <span className="dot" />
      <span className={`version-level ${level}`} data-testid="version-level" title={levelHint(level)}>
        {levelLabel(level)}
      </span>
    </>
  );
}

function VersionMeta({ version: v }: { version: Version }) {
  const kind = kindInfo(v);
  const files = v.changedFiles.length;
  return (
    <div className="version-meta">
      <span className={`version-kind ${v.meta.kind}`} data-kind={v.meta.kind} title={kind.hint}>
        <Icon name={kind.icon} size={12} />
        {kind.label}
      </span>
      <VersionLevel version={v} />
      <span className="dot" />
      <time dateTime={new Date(v.createdAt).toISOString()} title={formatTime(v.createdAt)}>
        {formatRelative(v.createdAt)}
      </time>
      <span className="dot version-file-count-dot" />
      <span className="version-file-count" title={v.changedFiles.join('\n')}>
        {files} file{files === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function rowClasses(props: VersionRowProps): string {
  const flags = { head: props.isHead, selected: props.isOpen, picked: props.picked, expanded: props.expanded };
  return ['version', ...Object.entries(flags).filter(([, on]) => on).map(([name]) => name)].join(' ');
}

export function VersionRow(props: VersionRowProps) {
  const { version: v, isHead, picked } = props;
  const title = displayTitle(v, props.index);
  const detailId = `version-detail-${v.id.slice(0, 12)}`;
  const [renaming, setRenaming] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const endRename = (name: string | null | undefined) => {
    setRenaming(false);
    if (name !== undefined) props.onRename(name);
    requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
  };
  return (
    <li className={rowClasses(props)}>
      <span className="version-node" aria-hidden="true" />
      <VersionThumb projectId={props.projectId} versionId={v.id} active={props.active} label={title} onOpen={props.onOpen} />
      <div className="version-main">
        <div className="version-title">
          {renaming ? (
            <RenameField initial={title} fallback={autoTitle(v, props.index)} onDone={endRename} />
          ) : (
            <button
              ref={toggle}
              type="button"
              className="version-toggle"
              aria-expanded={props.expanded}
              aria-controls={props.expanded ? detailId : undefined}
              aria-keyshortcuts="F2"
              onClick={props.onExpand}
              onDoubleClick={() => setRenaming(true)}
              onKeyDown={(event) => {
                if (event.key === 'F2') {
                  event.preventDefault();
                  setRenaming(true);
                }
              }}
            >
              <span title={v.meta.prompt ?? v.title}>{title}</span>
            </button>
          )}
          {isHead && <span className="badge accent">Head</span>}
        </div>
        <VersionMeta version={v} />
        {props.expanded && <VersionDetail version={v} index={props.index} id={detailId} onOpenVersion={props.onOpenVersion} />}
      </div>
      <div className="version-actions">
        <RowAction label="Open" icon="eye" tip="Open this version" onClick={props.onOpen} />
        <RowAction label="Restore" icon="restore" tip={isHead ? 'Already the head' : 'Restore as head'} disabled={isHead || props.locked} onClick={props.onRestore} />
        <RowAction
          label={picked ? 'Comparing' : 'Compare'}
          icon="compare"
          tip={picked ? 'Remove from compare' : 'Add to compare'}
          pressed={picked}
          onClick={props.onToggleCompare}
        />
        <RowAction label="Export" icon="download" tip="Export as zip" onClick={props.onExport} />
        <RowAction label="Branch" icon="branch" tip="New direction from here" onClick={props.onBranch} />
        {isHead && v.meta.level !== 'polish' && (
          <RowAction
            label="Polish this"
            icon="sparkle"
            tip="Run a Polish pass on this version"
            testId="version-polish-this"
            disabled={props.locked}
            onClick={props.onPolish}
          />
        )}
      </div>
    </li>
  );
}
