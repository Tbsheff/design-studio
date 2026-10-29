import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { FigmaImportPreview, FigmaImportResult, FigmaImportSource, FigmaImportStats } from '../../shared/figma-nodes';
import { looksLikeFigmaLink } from '../../shared/figma-nodes';
import type { InsertTarget, JsxInsertPosition } from '../../shared/insert';
import { ApiError, json } from '../api';
import { useModalDialog } from '../usePopover';
import { UiSelect } from './UiSelect';
import '../styles/figma-import.css';

interface Props {
  ids: { projectId: string; directionId: string };
  target: InsertTarget;
  text: string;
  canNest: boolean;
  onDone: (message: string) => void;
  onClose: () => void;
}

const POSITIONS: { value: JsxInsertPosition; label: string }[] = [
  { value: 'inside', label: 'Inside the selection' },
  { value: 'after', label: 'After the selection' },
  { value: 'before', label: 'Before the selection' },
];

function route(ids: Props['ids']): string {
  return `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/figma/import`;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof (error.data as { message?: unknown }).message === 'string') return (error.data as { message: string }).message;
  return error instanceof Error ? error.message : String(error);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function facts(stats: FigmaImportStats): string[] {
  const out = [plural(stats.layers, 'layer'), `${plural(stats.tokens, 'token color')}`];
  if (stats.rawColors.length > 0) out.push(plural(stats.rawColors.length, 'raw color'));
  if (stats.images > 0) out.push(plural(stats.images, 'image placeholder'));
  if (stats.hidden > 0) out.push(`${stats.hidden} hidden skipped`);
  return out;
}

function usePreview(ids: Props['ids'], base: FigmaImportSource, target: InsertTarget, nodeId: string, position: JsxInsertPosition) {
  const [preview, setPreview] = useState<FigmaImportPreview | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    json<FigmaImportPreview>('POST', route(ids), { ...base, target, position, dryRun: true, ...(nodeId ? { nodeId } : {}) })
      .then((result) => {
        if (!live) return;
        setPreview(result);
        setFailure(null);
      })
      .catch((error: unknown) => live && setFailure(messageOf(error)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [ids, base, target, nodeId, position]);
  return { preview, failure, loading, setFailure };
}

function Summary({ preview }: { preview: FigmaImportPreview }) {
  const { frame, stats } = preview;
  return (
    <div className="fgi-summary" aria-live="polite">
      <div className="fgi-frame">
        <strong>{frame.name}</strong>
        <span>{frame.width ? `${frame.width}×${frame.height}` : frame.type}</span>
      </div>
      <div className="fgi-facts">{facts(stats).join(' · ')}</div>
      {stats.kit.length > 0 && (
        <ul className="fgi-kit" aria-label="Kit components">
          {stats.kit.slice(0, 6).map((use, index) => (
            <li key={`${use.layer}-${index}`}>
              <span>{use.layer}</span>
              <code>{`<${use.component}>`}</code>
            </li>
          ))}
        </ul>
      )}
      {stats.notes.length > 0 && (
        <ul className="fgi-notes">
          {stats.notes.slice(0, 4).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <pre className="fgi-code" tabIndex={0} aria-label="Markup">
        {preview.markup}
      </pre>
    </div>
  );
}

export default function FigmaImportDialog({ ids, target, text, canNest, onDone, onClose }: Props) {
  const [base] = useState<FigmaImportSource>(() => (looksLikeFigmaLink(text) ? { link: text.trim() } : { nodes: text }));
  const [nodeId, setNodeId] = useState('');
  const [position, setPosition] = useState<JsxInsertPosition>(canNest ? 'inside' : 'after');
  const [busy, setBusy] = useState(false);
  const { preview, failure, loading, setFailure } = usePreview(ids, base, target, nodeId, position);
  const dialog = useModalDialog(() => {
    if (busy) return false;
    onClose();
  });
  const frames = preview?.frames ?? [];
  const chosen = nodeId || preview?.frame.id || '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !preview) return;
    setBusy(true);
    try {
      const result = await json<FigmaImportResult>('POST', route(ids), { ...base, target, position, nodeId: preview.frame.id });
      const kit = result.stats.kit.map((use) => use.component);
      const added = result.imports.filter((item) => item.added).length;
      onDone(`Imported ${result.frame.name}${kit.length ? ` with ${[...new Set(kit)].join(', ')}` : ''}${added ? `, ${plural(added, 'import')} added` : ''}.`);
      onClose();
    } catch (error) {
      setFailure(messageOf(error));
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') event.stopPropagation();
  };

  return (
    <dialog ref={dialog.ref} className="modal fgi-dialog" aria-label="Import Figma frame" onMouseDown={dialog.onMouseDown} onKeyDown={onKeyDown}>
      <form className="modal-form" onSubmit={(event) => void submit(event)} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Import Figma frame</h2>
            <p>{preview?.fileName ? `From ${preview.fileName}. ` : ''}Auto layout becomes flex, colors use your tokens, and kit instances become components.</p>
          </div>
        </div>
        <div className="modal-body fgi-form">
          {frames.length > 1 && (
            <div className="field">
              <span>Frame</span>
              <UiSelect className="ins-select fgi-select" aria-label="Frame" value={chosen} options={frames.map((frame) => ({ value: frame.id, label: `${frame.name}${frame.width ? ` · ${frame.width}×${frame.height}` : ''}` }))} onChange={setNodeId} />
            </div>
          )}
          <div className="field">
            <span>Place</span>
            <UiSelect className="ins-select fgi-select" aria-label="Place" value={position} options={canNest ? POSITIONS : POSITIONS.filter((item) => item.value !== 'inside')} onChange={setPosition} />
          </div>
          {preview && <Summary preview={preview} />}
          {loading && !preview && !failure && <div className="fgi-loading">Reading the Figma frame…</div>}
          {failure && (
            <div className="alert error small" role="alert">
              {failure}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || loading || !preview || failure !== null}>
            {busy ? 'Importing…' : 'Import frame'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
