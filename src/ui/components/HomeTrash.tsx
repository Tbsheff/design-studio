import { useEffect, useState } from 'react';
import { STUDIO_TOKEN_HEADER, type TrashItem } from '../../shared/contracts';
import { api, errorText, json } from '../api';
import { formatRelative, formatTime } from '../format';
import { getSession } from '../session';
import { useModalDialog } from '../usePopover';
import { Icon } from './Icon';

type Confirm = { kind: 'one'; item: TrashItem } | { kind: 'all'; count: number; folderStays: boolean };

const trashApi = {
  list: () => json<TrashItem[]>('GET', '/api/trash'),
  remove: (trashId: string) => json<{ deleted: number }>('DELETE', `/api/trash/${encodeURIComponent(trashId)}`),
  empty: () => json<{ deleted: number }>('DELETE', '/api/trash'),
};

function useTrashThumb(item: TrashItem): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!item.thumbnail) return;
    let made: string | null = null;
    let live = true;
    void fetch(`/api/trash/${encodeURIComponent(item.trashId)}/thumbnail`, { headers: { [STUDIO_TOKEN_HEADER]: getSession().token } })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || !live) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [item.trashId, item.thumbnail]);
  return url;
}

function TrashRow({ item, busy, onRestore, onDelete }: { item: TrashItem; busy: boolean; onRestore: () => void; onDelete: () => void }) {
  const thumb = useTrashThumb(item);
  return (
    <li className="trash-row" data-trash-id={item.trashId}>
      <div className="trash-thumb" aria-hidden="true">
        {thumb ? <img src={thumb} alt="" draggable={false} /> : <Icon name="doc" size={16} />}
      </div>
      <div className="trash-text">
        <span className="trash-name" title={item.name}>
          {item.name}
        </span>
        <span className="trash-meta">
          <time dateTime={new Date(item.trashedAt).toISOString()} data-tip={formatTime(item.trashedAt)}>
            Deleted {formatRelative(item.trashedAt).toLowerCase()}
          </time>
          {item.folderStays && <span> · Files in your folder stay</span>}
        </span>
      </div>
      <div className="trash-actions">
        <button type="button" className="btn small has-icon" onClick={onRestore} disabled={busy} aria-label={`Restore ${item.name}`}>
          <Icon name="restore" size={14} />
          Restore
        </button>
        <button type="button" className="btn small ghost danger" onClick={onDelete} disabled={busy} aria-label={`Delete ${item.name} forever`}>
          Delete forever
        </button>
      </div>
    </li>
  );
}

function ConfirmDelete({ confirm, busy, error, onCancel, onConfirm }: { confirm: Confirm; busy: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useModalDialog(() => (busy ? false : onCancel()));
  const title = confirm.kind === 'one' ? `Delete “${confirm.item.name}” forever?` : 'Empty the trash?';
  const what = confirm.kind === 'one' ? 'Its versions, runs and comments leave the app. You cannot undo this.' : `${confirm.count === 1 ? '1 project' : `${confirm.count} projects`} and their versions, runs and comments leave the app. You cannot undo this.`;
  const folders = confirm.kind === 'one' ? confirm.item.folderStays : confirm.folderStays;
  return (
    <dialog ref={dialog.ref} className="modal trash-confirm" aria-label={title} onMouseDown={dialog.onMouseDown}>
      <div className="modal-head">
        <div className="titles">
          <h2>{title}</h2>
          <p>
            {what}
            {folders ? ' Files in your folder stay.' : ''}
          </p>
        </div>
      </div>
      {error && (
        <div className="modal-body">
          <div className="alert error small" role="alert">
            {error}
          </div>
        </div>
      )}
      <div className="modal-foot">
        <button type="button" className="btn ghost" data-autofocus onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : confirm.kind === 'one' ? 'Delete forever' : 'Empty trash'}
        </button>
      </div>
    </dialog>
  );
}

export default function HomeTrash({ onClose, onRestored }: { onClose: () => void; onRestored: () => void }) {
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const dialog = useModalDialog(() => (confirm ? false : onClose()));

  const load = () => {
    setError(null);
    trashApi
      .list()
      .then(setItems)
      .catch((err: unknown) => setError(errorText(err)));
  };
  useEffect(load, []);

  const drop = (trashId: string) => setItems((list) => list?.filter((entry) => entry.trashId !== trashId) ?? list);

  const restore = async (item: TrashItem) => {
    setBusy(item.trashId);
    setError(null);
    try {
      await api.restoreProject(item.trashId);
      drop(item.trashId);
      setNote(`Restored “${item.name}”.`);
      onRestored();
      window.requestAnimationFrame(() => dialog.ref.current?.querySelector<HTMLButtonElement>('.trash-row .btn:not(:disabled), .modal-foot .btn:last-child')?.focus());
    } catch (err) {
      setError(`Could not restore “${item.name}”: ${errorText(err)}`);
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!confirm) return;
    setBusy('confirm');
    setConfirmError(null);
    try {
      if (confirm.kind === 'one') {
        await trashApi.remove(confirm.item.trashId);
        drop(confirm.item.trashId);
        setNote(`Deleted “${confirm.item.name}” forever.`);
      } else {
        const { deleted } = await trashApi.empty();
        setItems([]);
        setNote(deleted === 1 ? 'Deleted 1 project forever.' : `Deleted ${deleted} projects forever.`);
      }
      setConfirm(null);
      window.requestAnimationFrame(() => dialog.ref.current?.querySelector<HTMLButtonElement>('.trash-row .btn:not(:disabled), .modal-foot .btn:last-child')?.focus());
    } catch (err) {
      setConfirmError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const count = items?.length ?? 0;
  return (
    <dialog ref={dialog.ref} className="modal trash-modal" aria-labelledby="trash-title" onMouseDown={dialog.onMouseDown}>
      <div className="modal-head">
        <div className="titles">
          <h2 id="trash-title">Trash</h2>
          <p>Restore a deleted project, or delete it for good.</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Close Trash" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body trash-body">
        {error && (
          <div className="alert error small trash-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn small" onClick={load}>
              Retry
            </button>
          </div>
        )}
        {items !== null && items.length === 0 && (
          <div className="trash-empty">
            <Icon name="trash" size={16} />
            <strong>Trash is empty</strong>
            <span>Deleted projects stay here until you delete them for good.</span>
          </div>
        )}
        {items !== null && items.length > 0 && (
          <ul className="trash-list" aria-label="Deleted projects">
            {items.map((item) => (
              <TrashRow
                key={item.trashId}
                item={item}
                busy={busy !== null}
                onRestore={() => void restore(item)}
                onDelete={() => {
                  setConfirmError(null);
                  setConfirm({ kind: 'one', item });
                }}
              />
            ))}
          </ul>
        )}
        <span className="sr-only" role="status">
          {note}
        </span>
      </div>
      <div className="modal-foot">
        <span className="hint trash-count">{items === null ? '' : count === 1 ? '1 project' : `${count} projects`}</span>
        <button
          type="button"
          className="btn danger"
          disabled={count === 0 || busy !== null}
          onClick={() => {
            setConfirmError(null);
            setConfirm({ kind: 'all', count, folderStays: (items ?? []).every((item) => item.folderStays) });
          }}
        >
          Empty trash…
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Done
        </button>
      </div>
      {confirm && <ConfirmDelete confirm={confirm} busy={busy === 'confirm'} error={confirmError} onCancel={() => setConfirm(null)} onConfirm={() => void confirmDelete()} />}
    </dialog>
  );
}
