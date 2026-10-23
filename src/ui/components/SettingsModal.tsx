import { useState } from 'react';
import type { Project } from '../../shared/contracts';
import { api, errorText } from '../api';
import { useModalDialog } from '../usePopover';
import { Icon } from './Icon';
import { parseDraft, SettingsFields, toDraft } from './SettingsFields';

interface Props {
  project: Project;
  onSaved: (project: Project) => void;
  onClose: () => void;
}

export function SettingsModal({ project, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState(() => toDraft(project.settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialog = useModalDialog(onClose);

  const save = async () => {
    const parsed = parseDraft(draft);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.updateSettings(project.id, parsed.settings));
      onClose();
    } catch (err) {
      setError(`Could not save settings. ${errorText(err)} Try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog.ref} className="modal settings-modal" aria-label="Project settings" onMouseDown={dialog.onMouseDown}>
      <div className="modal-head">
        <div className="titles">
          <h2>Project settings</h2>
          <p>Applies to the next run.</p>
        </div>
        <button className="icon-btn" aria-label="Close settings" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">
        <SettingsFields draft={draft} onChange={setDraft} />
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </dialog>
  );
}
