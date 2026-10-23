import type { Version } from '../../shared/contracts';
import { formatRelative, formatTime } from '../format';
import { displayTitle, fullText, kindInfo, originOf, undoneOf, type VersionIndex } from '../versionLabels';
import { Icon, type IconName } from './Icon';
import { levelHint, levelLabel } from './LevelControl';

interface VersionRowProps {
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
      <span className="dot" />
      <span>
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
  return (
    <li className={rowClasses(props)}>
      <span className="version-node" aria-hidden="true" />
      <div className="version-main">
        <div className="version-title">
          <button type="button" className="version-toggle" aria-expanded={props.expanded} aria-controls={props.expanded ? detailId : undefined} onClick={props.onExpand}>
            <span title={v.meta.prompt ?? v.title}>{title}</span>
          </button>
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
