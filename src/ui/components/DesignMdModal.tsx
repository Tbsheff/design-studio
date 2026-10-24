import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Markdown } from '../ai/components/ai/markdown';
import { api, errorText } from '../api';
import { outlineOf, type OutlineItem } from '../designMdOutline';
import { useModalDialog } from '../usePopover';
import { MOD_LABEL } from './CommentPopover';
import { Icon } from './Icon';

function jumpTo(editor: HTMLTextAreaElement | null, preview: HTMLDivElement | null, item: OutlineItem, index: number): void {
  if (editor) {
    editor.focus();
    editor.setSelectionRange(item.offset, item.offset);
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, item.line * lineHeight - lineHeight);
  }
  const heading = preview?.querySelectorAll('h1, h2, h3')[index];
  if (heading instanceof HTMLElement && preview) preview.scrollTop = heading.offsetTop - preview.offsetTop - 8;
}

function Outline({ items, onJump }: { items: OutlineItem[]; onJump: (item: OutlineItem, index: number) => void }) {
  return (
    <nav className="dmd-outline" aria-label="Outline">
      <p className="dmd-pane-label">Outline</p>
      {items.length === 0 ? (
        <p className="dmd-outline-empty">Add a heading, like ## Color, to see it here.</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${item.line}:${item.text}`}>
              <button type="button" className={`dmd-outline-item level-${item.level}`} onClick={() => onJump(item, index)}>
                <span className="truncate">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function UnsavedBar({ saving, onSave, onDiscard, onKeep }: { saving: boolean; onSave: () => void; onDiscard: () => void; onKeep: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => keep.current?.focus(), []);
  return (
    <div className="modal-foot dmd-unsaved" role="alertdialog" aria-label="Unsaved changes" aria-describedby="dmd-unsaved-text">
      <span id="dmd-unsaved-text" className="dmd-unsaved-text">
        <Icon name="alert" size={14} />
        Save your changes to DESIGN.md?
      </span>
      <button className="btn ghost" onClick={onDiscard} disabled={saving}>
        Discard
      </button>
      <button ref={keep} className="btn ghost" onClick={onKeep} disabled={saving}>
        Keep editing
      </button>
      <button className="btn primary" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

export function DesignMdModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDesignMd(projectId)
      .then((r) => {
        setContent(r.content);
        setOriginal(r.content);
      })
      .catch((err) => {
        setContent('');
        setError(`Could not load DESIGN.md. ${errorText(err)} Close this window and open it again.`);
      });
  }, [projectId]);

  const dirty = content !== null && original !== null && content !== original;
  const state = useRef({ dirty, asking });
  state.current = { dirty, asking };
  const requestClose = () => {
    if (state.current.asking) {
      setAsking(false);
      return false;
    }
    if (!state.current.dirty) {
      onClose();
      return;
    }
    setAsking(true);
    return false;
  };

  const dialog = useModalDialog(requestClose);
  const editor = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const loaded = content !== null;
  const shown = useDeferredValue(content ?? '');
  const outline = useMemo(() => outlineOf(shown), [shown]);

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
      setAsking(false);
      setError(`Could not save DESIGN.md. ${errorText(err)} Try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog.ref} className="modal dmd" aria-label="DESIGN.md" onMouseDown={dialog.onMouseDown}>
      <div className="modal-head">
        <div className="titles">
          <h2>
            DESIGN.md
            {dirty && <span className="dmd-dirty">Unsaved</span>}
          </h2>
          <p>The agent reads this file on every run.</p>
        </div>
        <button className="icon-btn" aria-label="Close DESIGN.md" onClick={() => requestClose()}>
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body dmd-body">
        <Outline items={outline} onJump={(item, index) => jumpTo(editor.current, preview.current, item, index)} />
        <div className="dmd-pane">
          <p className="dmd-pane-label">Markdown</p>
          <textarea
            ref={editor}
            className="mono design-md"
            aria-label="DESIGN.md content"
            value={content ?? ''}
            disabled={content === null}
            onChange={(e) => {
              setContent(e.target.value);
              setAsking(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void save();
              }
            }}
            placeholder={'# Brand\nPrimary color, type, spacing and voice rules the agent should follow.'}
            spellCheck={false}
          />
        </div>
        <div className="dmd-pane">
          <p className="dmd-pane-label">Preview</p>
          <div ref={preview} className="dmd-preview" aria-label="DESIGN.md preview" tabIndex={0}>
            {shown.trim() ? <Markdown>{shown}</Markdown> : <p className="dmd-outline-empty">Nothing to show yet.</p>}
          </div>
        </div>
      </div>
      {error && (
        <div className="alert error dmd-error" role="alert">
          {error}
        </div>
      )}
      {asking ? (
        <UnsavedBar saving={saving} onSave={() => void save()} onDiscard={onClose} onKeep={() => setAsking(false)} />
      ) : (
        <div className="modal-foot">
          <span className="hint">
            <kbd>{MOD_LABEL === '⌘' ? '⌘' : 'Ctrl'}</kbd>
            <kbd>S</kbd> to save
          </span>
          <button className="btn ghost" onClick={() => requestClose()}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => void save()} disabled={saving || content === null || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </dialog>
  );
}
