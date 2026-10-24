import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { RUN_TITLE_MAX } from '../../shared/rewind';
import type { RunView } from '../runState';
import { UserMessage } from './ChatParts';
import { Icon, type IconName } from './Icon';

export interface TurnRewind {
  restoreTip: string | null;
  restoreVersionId: string | null;
  forkBase: string | null;
  editTip: string | null;
}

export interface TurnActions {
  onRestore: (versionId: string) => void;
  onEditResend: (run: RunView, prompt: string, fromVersionId: string) => Promise<void>;
  onRename: (runId: string, title: string) => Promise<void>;
  dirtyCount: () => number;
}

function TurnButton({ label, icon, tip, onClick }: { label: string; icon: IconName; tip: string | null; onClick: () => void }) {
  const off = tip !== null;
  return (
    <button
      type="button"
      className="icon-btn small msg-action"
      aria-label={label}
      aria-disabled={off || undefined}
      data-tip={tip ?? label}
      data-tip-side="top"
      onClick={(event) => {
        event.stopPropagation();
        if (!off) onClick();
      }}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

function RestoreConfirm({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="msg-confirm" role="alertdialog" aria-label="Restore code here" data-testid="restore-confirm">
      <p>
        Unfinished changes in {count} file{count === 1 ? '' : 's'} will be replaced. Files no version tracks stay.
      </p>
      <div className="msg-confirm-actions">
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn small primary" autoFocus onClick={onConfirm}>
          Restore
        </button>
      </div>
    </div>
  );
}

function MessageEditor({ initial, onCancel, onSend }: { initial: string; onCancel: () => void; onSend: (prompt: string) => void }) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }, []);
  const ready = text.trim() !== '';
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    } else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (ready) onSend(text.trim());
    }
  };
  return (
    <div className="msg-editor" data-testid="message-editor">
      <textarea ref={ref} aria-label="Edit message" rows={Math.min(8, Math.max(2, text.split('\n').length))} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} />
      <div className="msg-editor-foot">
        <span className="msg-editor-hint">
          <Icon name="branch" size={12} />
          Sends to a new direction
        </span>
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn small primary" disabled={!ready} onClick={() => onSend(text.trim())}>
          Send
        </button>
      </div>
    </div>
  );
}

function TitleField({ initial, onDone }: { initial: string; onDone: (title: string | null) => void }) {
  const [text, setText] = useState(initial);
  const done = useRef(false);
  const finish = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(value);
  };
  return (
    <input
      autoFocus
      className="run-title-input"
      aria-label="Run name"
      placeholder="Name this run"
      maxLength={RUN_TITLE_MAX}
      value={text}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => finish(text.trim())}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') finish(text.trim());
        else if (event.key === 'Escape') finish(null);
      }}
    />
  );
}

type Mode = 'idle' | 'confirm' | 'edit' | 'rename';

export function UserTurn({ run, title, rewind, actions }: { run: RunView; title: string | undefined; rewind: TurnRewind | null; actions: TurnActions | null }) {
  const [mode, setMode] = useState<Mode>('idle');
  const [renameFailed, setRenameFailed] = useState(false);
  const request = run.request;
  if (!rewind || !actions || !request || request.retryOf) return <UserMessage run={run} title={title} />;
  const restore = () => {
    if (!rewind.restoreVersionId) return;
    if (actions.dirtyCount() > 0) setMode('confirm');
    else actions.onRestore(rewind.restoreVersionId);
  };
  const tools = (
    <span className="msg-actions" data-testid="message-actions">
      <TurnButton label="Restore code here" icon="restore" tip={rewind.restoreTip} onClick={restore} />
      <TurnButton label="Edit and resend" icon="branch" tip={rewind.editTip} onClick={() => setMode('edit')} />
      <TurnButton label="Rename" icon="pencil" tip={null} onClick={() => setMode('rename')} />
    </span>
  );
  const editor =
    mode === 'edit' && rewind.forkBase ? (
      <MessageEditor
        initial={request.prompt}
        onCancel={() => setMode('idle')}
        onSend={(prompt) => {
          setMode('idle');
          if (rewind.forkBase) void actions.onEditResend(run, prompt, rewind.forkBase);
        }}
      />
    ) : null;
  const titleSlot =
    mode === 'rename' ? (
      <TitleField
        initial={title ?? ''}
        onDone={(next) => {
          setMode('idle');
          setRenameFailed(false);
          if (next !== null && next !== (title ?? '')) actions.onRename(run.runId, next).catch(() => setRenameFailed(true));
        }}
      />
    ) : undefined;
  return (
    <>
      <UserMessage run={run} title={title} tools={tools} replaceBody={editor} titleSlot={titleSlot} onRename={() => setMode('rename')} />
      {renameFailed && (
        <p className="msg-turn-error" role="alert">
          Could not rename this run. Try again.
        </p>
      )}
      {mode === 'confirm' && rewind.restoreVersionId && (
        <RestoreConfirm
          count={actions.dirtyCount()}
          onCancel={() => setMode('idle')}
          onConfirm={() => {
            setMode('idle');
            if (rewind.restoreVersionId) actions.onRestore(rewind.restoreVersionId);
          }}
        />
      )}
    </>
  );
}
