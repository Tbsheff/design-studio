import { useState, type FormEvent } from 'react';
import type { PackSummary } from '../../shared/contracts';
import { errorText } from '../api';
import { useModalDialog } from '../usePopover';
import { Icon } from './Icon';

function useBusyAction(onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await task();
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Head({ title, text, busy, onClose }: { title: string; text: string; busy: boolean; onClose: () => void }) {
  return (
    <div className="modal-head">
      <div className="titles">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button type="button" className="icon-btn" aria-label={`Close ${title}`} onClick={onClose} disabled={busy}>
        <Icon name="close" />
      </button>
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="alert error small" role="alert">
      {error}
    </div>
  );
}

export function RenamePackDialog({ pack, onClose, onRename }: { pack: PackSummary; onClose: () => void; onRename: (name: string) => Promise<void> }) {
  const [name, setName] = useState(pack.name);
  const action = useBusyAction(onClose);
  const dialog = useModalDialog(() => (action.busy ? false : onClose()));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== pack.name) void action.run(() => onRename(name.trim()));
  };
  return (
    <dialog ref={dialog.ref} className="modal" aria-label="Rename design system" onMouseDown={dialog.onMouseDown}>
      <form className="modal-form" onSubmit={submit}>
        <Head title="Rename design system" text="Projects that use it keep working. Its id does not change." busy={action.busy} onClose={onClose} />
        <div className="modal-body">
          <label className="field">
            <span>Name</span>
            <input data-autofocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Design system name" />
          </label>
          <ErrorLine error={action.error} />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={action.busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={action.busy || !name.trim() || name.trim() === pack.name}>
            {action.busy ? 'Renaming…' : 'Rename'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function DeletePackDialog({ pack, onClose, onDelete }: { pack: PackSummary; onClose: () => void; onDelete: () => Promise<void> }) {
  const action = useBusyAction(onClose);
  const dialog = useModalDialog(() => (action.busy ? false : onClose()));
  return (
    <dialog ref={dialog.ref} className="modal" aria-label="Delete design system" onMouseDown={dialog.onMouseDown}>
      <Head title={`Delete ${pack.name}?`} text="It leaves your library. Projects that use it keep their files." busy={action.busy} onClose={onClose} />
      <div className="modal-body">
        <ErrorLine error={action.error} />
      </div>
      <div className="modal-foot">
        <button type="button" className="btn ghost" data-autofocus onClick={onClose} disabled={action.busy}>
          Cancel
        </button>
        <button type="button" className="btn danger" onClick={() => void action.run(onDelete)} disabled={action.busy}>
          {action.busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </dialog>
  );
}

export function ImportConflictDialog({ existing, onClose, onChoose }: { existing: PackSummary; onClose: () => void; onChoose: (mode: 'replace' | 'copy') => Promise<void> }) {
  const action = useBusyAction(onClose);
  const dialog = useModalDialog(() => (action.busy ? false : onClose()));
  return (
    <dialog ref={dialog.ref} className="modal" aria-label="Design system already in your library" onMouseDown={dialog.onMouseDown}>
      <Head
        title={`${existing.name} is already in your library`}
        text="Replace it with the files in the zip, or keep both. Projects keep their own files."
        busy={action.busy}
        onClose={onClose}
      />
      <div className="modal-body">
        <ErrorLine error={action.error} />
      </div>
      <div className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose} disabled={action.busy}>
          Cancel
        </button>
        <button type="button" className="btn" onClick={() => void action.run(() => onChoose('copy'))} disabled={action.busy}>
          Keep both
        </button>
        <button type="button" className="btn primary" data-autofocus onClick={() => void action.run(() => onChoose('replace'))} disabled={action.busy}>
          Replace
        </button>
      </div>
    </dialog>
  );
}
