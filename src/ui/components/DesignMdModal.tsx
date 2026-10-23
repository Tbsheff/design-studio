import { useEffect, useRef, useState } from 'react';
import { api, errorText } from '../api';
import { useModalDialog } from '../usePopover';
import { MOD_LABEL } from './CommentPopover';
import { Icon } from './Icon';

export function DesignMdModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDesignMd(projectId)
      .then((r) => setContent(r.content))
      .catch((err) => {
        setContent('');
        setError(`Could not load DESIGN.md. ${errorText(err)} Close this window and open it again.`);
      });
  }, [projectId]);

  const dialog = useModalDialog(onClose);
  const editor = useRef<HTMLTextAreaElement>(null);
  const loaded = content !== null;

  useEffect(() => {
    if (loaded) editor.current?.focus();
  }, [loaded]);

  const save = async () => {
    if (content === null) return;
    setSaving(true);
    setError(null);
    try {
      await api.putDesignMd(projectId, content);
      onClose();
    } catch (err) {
      setError(`Could not save DESIGN.md. ${errorText(err)} Try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog.ref} className="modal wide" aria-label="DESIGN.md" onMouseDown={dialog.onMouseDown}>
      <div className="modal-head">
        <div className="titles">
          <h2>DESIGN.md</h2>
          <p>The agent reads this file on every run.</p>
        </div>
        <button className="icon-btn" aria-label="Close DESIGN.md" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">
        <textarea
          ref={editor}
          className="mono design-md"
          aria-label="DESIGN.md content"
          value={content ?? ''}
          disabled={content === null}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void save();
            }
          }}
          placeholder={'# Brand\nPrimary color, type, spacing and voice rules the agent should follow.'}
          spellCheck={false}
        />
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-foot">
        <span className="hint">
          <kbd>{MOD_LABEL === '⌘' ? '⌘' : 'Ctrl'}</kbd>
          <kbd>S</kbd> to save
        </span>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={() => void save()} disabled={saving || content === null}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </dialog>
  );
}
