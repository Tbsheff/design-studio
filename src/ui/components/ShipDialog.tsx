import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { renderBranchName, renderShipTemplate, type ShipFile, type ShipMode, type ShipPrepare, type ShipRequest, type ShipResult } from '../../shared/ship';
import { errorText } from '../api';
import { shipApi } from '../shipApi';
import { useModalDialog } from '../usePopover';
import { Icon } from './Icon';
import '../styles/ship.css';

interface Props {
  projectId: string;
  onClose: () => void;
}

const STATUS_LETTER: Record<ShipFile['status'], string> = { added: 'A', modified: 'M', deleted: 'D' };

const MODES: { id: ShipMode; label: string; hint: string }[] = [
  { id: 'branch', label: 'Branch only', hint: 'Commit on a new local branch. Nothing leaves this computer.' },
  { id: 'push', label: 'Push branch', hint: 'Commit, then push the branch to the remote. No force push.' },
  { id: 'pr', label: 'Open pull request', hint: 'Commit, push, then run gh pr create.' },
];

interface Draft {
  files: Set<string>;
  branch: string | null;
  commitMessage: string | null;
  title: string | null;
  body: string | null;
  issue: string;
  mode: ShipMode;
}

function shippable(file: ShipFile): boolean {
  return !file.refused && !file.conflict;
}

function freshDraft(plan: ShipPrepare, mode: ShipMode): Draft {
  return { files: new Set(plan.files.filter(shippable).map((f) => f.path)), branch: null, commitMessage: null, title: null, body: null, issue: plan.settings.issueId, mode };
}

function modeBlock(plan: ShipPrepare, mode: ShipMode): string | null {
  const repo = plan.repo;
  if (!repo || mode === 'branch') return null;
  if (!repo.remote) return 'The repo has no remote.';
  if (mode === 'pr' && !repo.gh) return 'Install the GitHub CLI (gh) to open pull requests.';
  if (mode === 'pr' && !repo.github) return 'The remote is not on GitHub.';
  return null;
}

function DiffView({ file }: { file: ShipFile | null }) {
  if (!file) return <div className="ship-diff empty">Pick a file to see its diff.</div>;
  const all = file.diff.replace(/\n$/, '').split('\n');
  const start = all.findIndex((line) => line.startsWith('@@'));
  const lines = start === -1 ? [file.diff.includes('Binary files') ? 'Binary file. No text diff.' : file.status === 'deleted' ? 'The file is deleted.' : 'No text changes.'] : all.slice(start);
  return (
    <div className="ship-diff" aria-label={`Diff of ${file.path}`}>
      {(file.refused || file.conflict) && <div className={`ship-diff-note ${file.refused ? 'refused' : 'conflict'}`}>{file.refused ?? file.conflict}</div>}
      <pre>
        {lines.map((line, i) => (
          <span key={i} className={line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : undefined}>
            {line || ' '}
            {'\n'}
          </span>
        ))}
      </pre>
      {file.diffCut && <div className="ship-diff-note">The diff is cut here. The full file ships.</div>}
    </div>
  );
}

function ResultView({ result, onClose }: { result: ShipResult; onClose: () => void }) {
  return (
    <>
      <div className="modal-body ship-result" role="status">
        <p className="ship-result-lead">
          <Icon name="check" size={14} /> {result.mode === 'branch' ? 'Branch created in your repo.' : result.prUrl ? 'Pull request opened.' : 'Branch pushed.'} Your checked-out branch and files did not change.
        </p>
        <dl className="ship-facts">
          <dt>Branch</dt>
          <dd className="mono">{result.branch}</dd>
          <dt>Commit</dt>
          <dd className="mono">{result.sha.slice(0, 12)}</dd>
          <dt>Files</dt>
          <dd>{result.files.length}</dd>
          {result.pushed && (
            <>
              <dt>Pushed to</dt>
              <dd className="mono">{result.remote}</dd>
            </>
          )}
          {result.prUrl && (
            <>
              <dt>Pull request</dt>
              <dd>
                <a href={result.prUrl} target="_blank" rel="noreferrer noopener">
                  {result.prUrl}
                </a>
              </dd>
            </>
          )}
        </dl>
        {result.prError && (
          <div className="alert warn small" role="alert">
            {result.prError}
          </div>
        )}
        {result.mode === 'branch' && <p className="field-help">To see it: git switch {result.branch}</p>}
      </div>
      <div className="modal-foot">
        <span className="ship-spacer" />
        <button type="button" className="btn primary" data-autofocus onClick={onClose}>
          Done
        </button>
      </div>
    </>
  );
}

interface Fields {
  title: string;
  branch: string;
  body: string;
  commitMessage: string;
}

function fieldsOf(plan: ShipPrepare, draft: Draft): Fields {
  const title = draft.title ?? plan.defaults.title;
  const vars = { ...plan.vars, issue: draft.issue, title, files: plan.files.filter((f) => draft.files.has(f.path)).map((f) => f.path) };
  return {
    title,
    branch: draft.branch ?? renderBranchName(plan.settings.branchTemplate, vars),
    body: draft.body ?? renderShipTemplate(plan.settings.bodyTemplate, vars),
    commitMessage: draft.commitMessage ?? plan.defaults.commitMessage,
  };
}

function leadText(plan: ShipPrepare | null): string {
  if (!plan?.repo) return 'Commit studio changes to a new branch in your repo.';
  return `Makes a new branch from ${plan.repo.branch ?? plan.repo.head.slice(0, 7)} in ${plan.repo.root}. Your checked-out branch, files and index do not change.`;
}

function shipRequestOf(plan: ShipPrepare | null, draft: Draft | null, fields: Fields | null): ShipRequest | null {
  if (!plan?.base || !plan.headVersionId || plan.blocked || !draft || !fields) return null;
  if (draft.files.size === 0 || !fields.branch.trim() || !fields.commitMessage.trim() || modeBlock(plan, draft.mode)) return null;
  const files = plan.files.filter((f) => draft.files.has(f.path)).map((f) => f.path);
  return { baseVersionId: plan.base.versionId, headVersionId: plan.headVersionId, files, branch: fields.branch.trim(), commitMessage: fields.commitMessage, title: fields.title, body: fields.body, mode: draft.mode };
}

function actionLabel(mode: ShipMode): string {
  if (mode === 'pr') return 'Open pull request';
  if (mode === 'push') return 'Push branch';
  return 'Create branch';
}

function usePlan(projectId: string, baseId: string | undefined) {
  const [plan, setPlan] = useState<ShipPrepare | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setPlan(null);
    setLoadError(null);
    shipApi
      .prepare(projectId, baseId)
      .then((next) => {
        if (!live) return;
        setPlan(next);
        setDraft((prev) => freshDraft(next, prev?.mode ?? 'branch'));
        setFocus(next.files.find(shippable)?.path ?? next.files[0]?.path ?? null);
      })
      .catch((err: unknown) => live && setLoadError(errorText(err)));
    return () => {
      live = false;
    };
  }, [projectId, baseId]);
  return { plan, draft, setDraft, focus, setFocus, loadError };
}

function FileList({ plan, draft, focus, onFocus, onToggle }: { plan: ShipPrepare; draft: Draft; focus: string | null; onFocus: (path: string) => void; onToggle: (path: string) => void }) {
  return (
    <div className="ship-files-wrap">
      <ul className="ship-files" aria-label="Changed files">
        {plan.files.map((file) => (
          <li key={file.path} className={file.path === focus ? 'active' : undefined}>
            <input type="checkbox" aria-label={`Ship ${file.path}`} checked={draft.files.has(file.path)} disabled={!shippable(file)} onChange={() => onToggle(file.path)} />
            <button type="button" className="ship-file" onClick={() => onFocus(file.path)} title={file.refused ?? file.conflict ?? file.path}>
              <span className={`ship-status ${file.status}`}>{STATUS_LETTER[file.status]}</span>
              <span className="mono truncate">{file.path}</span>
              {(file.refused || file.conflict) && <Icon name="alert" size={12} />}
              <span className="ship-counts">
                {file.additions !== null && <span className="add">+{file.additions}</span>}
                {file.deletions !== null && <span className="del">−{file.deletions}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <DiffView file={plan.files.find((f) => f.path === focus) ?? null} />
    </div>
  );
}

function ModePicker({ plan, mode, onMode }: { plan: ShipPrepare; mode: ShipMode; onMode: (mode: ShipMode) => void }) {
  return (
    <fieldset className="ship-modes ship-wide">
      <legend>When done</legend>
      {MODES.map((item) => {
        const why = modeBlock(plan, item.id);
        return (
          <label key={item.id} className={`ship-mode${why ? ' off' : ''}`} title={why ?? item.hint}>
            <input type="radio" name="ship-mode" checked={mode === item.id} disabled={Boolean(why)} onChange={() => onMode(item.id)} />
            <span>{item.label}</span>
            <small>{why ?? item.hint}</small>
          </label>
        );
      })}
    </fieldset>
  );
}

function ShipFields({ plan, draft, fields, patch }: { plan: ShipPrepare; draft: Draft; fields: Fields; patch: (next: Partial<Draft>) => void }) {
  return (
    <div className="ship-fields">
      <label className="field">
        <span>Issue id</span>
        <input className="mono" value={draft.issue} placeholder="QA-1234" spellCheck={false} autoComplete="off" onChange={(e) => patch({ issue: e.target.value })} />
      </label>
      <label className="field">
        <span>Branch</span>
        <input className="mono" value={fields.branch} spellCheck={false} autoComplete="off" onChange={(e) => patch({ branch: e.target.value })} />
      </label>
      <label className="field ship-wide">
        <span>Commit message</span>
        <textarea className="mono" rows={3} value={fields.commitMessage} onChange={(e) => patch({ commitMessage: e.target.value })} />
      </label>
      <ModePicker plan={plan} mode={draft.mode} onMode={(mode) => patch({ mode })} />
      {draft.mode === 'pr' && (
        <>
          <label className="field ship-wide">
            <span>Pull request title</span>
            <input value={fields.title} onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="field ship-wide">
            <span>Pull request body</span>
            <textarea className="mono" rows={6} value={fields.body} onChange={(e) => patch({ body: e.target.value })} />
          </label>
        </>
      )}
    </div>
  );
}

function PlanView({ plan, draft, fields, focus, onFocus, onBase, setDraft }: { plan: ShipPrepare; draft: Draft | null; fields: Fields | null; focus: string | null; onFocus: (path: string) => void; onBase: (id: string) => void; setDraft: Dispatch<SetStateAction<Draft | null>> }) {
  const patch = (next: Partial<Draft>) => setDraft((prev) => (prev ? { ...prev, ...next } : prev));
  const toggle = (file: string) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const files = new Set(prev.files);
      if (!files.delete(file)) files.add(file);
      return { ...prev, files };
    });
  return (
    <>
      <label className="field ship-base">
        <span>Changes since</span>
        <select value={plan.base?.versionId ?? ''} onChange={(e) => onBase(e.target.value)} disabled={plan.bases.length === 0}>
          {plan.bases.map((b) => (
            <option key={b.versionId} value={b.versionId}>
              {b.title}
            </option>
          ))}
        </select>
      </label>
      {plan.blocked && (
        <div className="alert small" role="status">
          {plan.blocked}
        </div>
      )}
      {plan.files.length > 0 && draft && <FileList plan={plan} draft={draft} focus={focus} onFocus={onFocus} onToggle={toggle} />}
      {plan.files.some((f) => f.conflict) && <p className="ship-warn">Some files have your own changes that differ from the studio base. They cannot ship until you commit or undo them. Pick a file to see why.</p>}
      {draft && fields && !plan.blocked && <ShipFields plan={plan} draft={draft} fields={fields} patch={patch} />}
    </>
  );
}

export default function ShipDialog({ projectId, onClose }: Props) {
  const [baseId, setBaseId] = useState<string | undefined>(undefined);
  const { plan, draft, setDraft, focus, setFocus, loadError } = usePlan(projectId, baseId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShipResult | null>(null);
  const dialog = useModalDialog(() => {
    if (busy) return false;
    onClose();
  });
  const fields = useMemo(() => (plan && draft ? fieldsOf(plan, draft) : null), [plan, draft]);
  const count = draft?.files.size ?? 0;
  const request = shipRequestOf(plan, draft, fields);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || busy) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await shipApi.ship(projectId, request));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = error ?? loadError;
  return (
    <dialog ref={dialog.ref} className="modal ship-dialog" aria-label="Ship as branch and PR" onMouseDown={dialog.onMouseDown}>
      <form className="modal-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Ship as branch and PR</h2>
            <p>{leadText(plan)}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} disabled={busy}>
            <Icon name="close" />
          </button>
        </div>
        {result ? (
          <ResultView result={result} onClose={onClose} />
        ) : (
          <>
            <div className="modal-body ship-body">
              {!plan && !shown && <p className="muted">Reading changes…</p>}
              {plan && <PlanView plan={plan} draft={draft} fields={fields} focus={focus} onFocus={setFocus} onBase={setBaseId} setDraft={setDraft} />}
              {shown && (
                <div className="alert error small" role="alert">
                  {shown}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <span className="ship-foot-note">Git hooks do not run. .env files, secrets and node_modules never ship.</span>
              <span className="ship-spacer" />
              <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={!request || busy}>
                {busy ? 'Shipping…' : `${actionLabel(draft?.mode ?? 'branch')}${count > 0 ? ` (${count})` : ''}`}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
