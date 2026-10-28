import { useEffect, useState } from 'react';
import type { Version, VersionChanges, VersionFileDiff } from '../../shared/contracts';
import { errorText, json } from '../api';
import { Icon } from './Icon';
import '../styles/compare-code.css';

interface Line {
  kind: 'add' | 'del' | 'ctx' | 'gap';
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;
const OPEN_ALL_MAX = 8;

function hunkLine(raw: string, at: { old: number; new: number }): Line | null {
  const sign = raw.charAt(0);
  const text = raw.slice(1);
  if (sign === '+') return { kind: 'add', oldNo: null, newNo: at.new++, text };
  if (sign === '-') return { kind: 'del', oldNo: at.old++, newNo: null, text };
  if (sign === ' ') return { kind: 'ctx', oldNo: at.old++, newNo: at.new++, text };
  return null;
}

function patchLines(patch: string): Line[] {
  const lines: Line[] = [];
  const at = { old: 0, new: 0 };
  let inHunk = false;
  for (const raw of patch.split('\n')) {
    const hunk = HUNK.exec(raw);
    if (hunk) {
      at.old = Number(hunk[1]);
      at.new = Number(hunk[2]);
      inHunk = true;
      lines.push({ kind: 'gap', oldNo: null, newNo: null, text: raw });
      continue;
    }
    const line = inHunk ? hunkLine(raw, at) : null;
    if (line) lines.push(line);
  }
  return lines;
}

const STATUS_WORD: Record<VersionFileDiff['status'], string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Changed',
  renamed: 'Renamed',
};

function FilePatch({ file }: { file: VersionFileDiff }) {
  if (file.binary) return <div className="diff-view compare-code-note">Binary file. No text diff.</div>;
  const lines = patchLines(file.patch);
  if (lines.length === 0) return <div className="diff-view compare-code-note">No line changes.</div>;
  return (
    <div className="diff-view compare-code-view" role="table" aria-label={`Diff of ${file.path}`}>
      {lines.map((line, index) =>
        line.kind === 'gap' ? (
          <div key={index} className="diff-gap" role="row">
            {line.text}
          </div>
        ) : (
          <div key={index} className={`diff-line ${line.kind === 'ctx' ? '' : line.kind}`} role="row">
            <span className="diff-no">{line.oldNo ?? ''}</span>
            <span className="diff-no">{line.newNo ?? ''}</span>
            <span className="diff-sign">{line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ''}</span>
            <span className="diff-text">{line.text}</span>
          </div>
        ),
      )}
      {file.truncated && <div className="diff-gap">The diff is longer. The rest is cut.</div>}
    </div>
  );
}

function FileSection({ file, open, onToggle }: { file: VersionFileDiff; open: boolean; onToggle: () => void }) {
  const name = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;
  return (
    <li className="compare-code-file">
      <button type="button" className="compare-code-head" aria-expanded={open} onClick={onToggle} data-tip={name}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
        <span className="compare-code-path truncate mono">{name}</span>
        <span className={`compare-code-status ${file.status}`}>{STATUS_WORD[file.status]}</span>
        <span className="diff-badge">
          <span className="diff-plus">+{file.additions}</span>
          <span className="diff-minus">−{file.deletions}</span>
        </span>
      </button>
      {open && <FilePatch file={file} />}
    </li>
  );
}

function useChanges(projectId: string, from: string, to: string) {
  const [state, setState] = useState<{
    key: string;
    changes: VersionChanges | null;
    error: string | null;
  } | null>(null);
  const key = `${projectId}/${from}/${to}`;
  useEffect(() => {
    let live = true;
    json<VersionChanges>('GET', `/api/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(from)}/changes/${encodeURIComponent(to)}`).then(
      (changes) => live && setState({ key, changes, error: null }),
      (error: unknown) => live && setState({ key, changes: null, error: errorText(error) }),
    );
    return () => {
      live = false;
    };
  }, [projectId, from, to, key]);
  return state?.key === key ? state : null;
}

function Summary({ changes }: { changes: VersionChanges }) {
  const add = changes.files.reduce((sum, file) => sum + file.additions, 0);
  const del = changes.files.reduce((sum, file) => sum + file.deletions, 0);
  const more = changes.totalFiles - changes.files.length;
  return (
    <div className="compare-code-summary">
      <span>
        {changes.totalFiles} {changes.totalFiles === 1 ? 'file' : 'files'} changed
      </span>
      <span className="diff-badge">
        <span className="diff-plus">+{add}</span>
        <span className="diff-minus">−{del}</span>
      </span>
      {more > 0 && <span className="compare-code-more">{more} more files not shown</span>}
    </div>
  );
}

export default function CompareCode({ projectId, older, newer }: { projectId: string; older: Version; newer: Version }) {
  const state = useChanges(projectId, older.id, newer.id);
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  if (!state)
    return (
      <div className="compare-code-empty" role="status">
        Loading the code diff…
      </div>
    );
  if (state.error || !state.changes)
    return (
      <div className="stage-message" role="alert">
        {state.error ?? 'Could not load the code diff.'}
      </div>
    );
  const { changes } = state;
  if (changes.files.length === 0) return <div className="compare-code-empty">These versions have the same files.</div>;
  const openByDefault = changes.files.length <= OPEN_ALL_MAX;
  const toggle = (path: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  return (
    <div className="compare-code">
      <Summary changes={changes} />
      <ul className="compare-code-files">
        {changes.files.map((file) => (
          <FileSection key={file.path} file={file} open={openByDefault !== toggled.has(file.path)} onToggle={() => toggle(file.path)} />
        ))}
      </ul>
    </div>
  );
}
