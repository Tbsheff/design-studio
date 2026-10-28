import { useState, type ReactNode } from 'react';
import type { DesignComment, SelectionContext } from '../../shared/contracts';
import type { CommentsControl } from '../useComments';
import { canPickForChat } from '../../shared/comments';
import { CommentAuthor } from './CommentAvatar';
import { CommentReplies } from './CommentPopover';
import { Icon } from './Icon';
import '../styles/comments.css';

interface Props {
  control: CommentsControl;
  running: boolean;
  onOpenRun: (runId: string) => void;
  onOpenVersion: (versionId: string) => void;
  selection?: SelectionContext[];
}

function targetLabel(comment: DesignComment): string {
  if (comment.drawing) {
    const { box } = comment.drawing;
    return `Drawing · ${box.width} × ${box.height}`;
  }
  const loc = comment.target.sourceLoc;
  const where = loc ? `${loc.file.split('/').pop()}:${loc.line}` : comment.target.selector;
  const snippet = comment.target.textSnippet ? ` “${comment.target.textSnippet.slice(0, 32)}”` : '';
  return `${comment.target.tag}${snippet} · ${where}`;
}

function PickNum({ comment, control }: { comment: DesignComment; control: CommentsControl }) {
  if (!canPickForChat(comment.status)) return <span className={`comment-num ${comment.status}`}>{comment.n}</span>;
  const on = control.picked.includes(comment.id);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={`Select comment ${comment.n} for the chat`}
      data-tip={on ? 'Selected for the chat' : 'Select for the chat'}
      className={`comment-num ${comment.status} pick${on ? ' picked' : ''}`}
      data-testid="comment-pick"
      onClick={() => control.togglePick(comment.id)}
    >
      {on ? <Icon name="check" size={12} /> : comment.n}
    </button>
  );
}

function FixButton({ comment, control }: { comment: DesignComment; control: CommentsControl }) {
  if (!canPickForChat(comment.status)) return null;
  return (
    <button
      type="button"
      className="icon-btn small"
      aria-label={`Fix comment ${comment.n} with the agent`}
      data-tip="Fix with agent"
      data-testid="comment-fix"
      disabled={control.preparing}
      onClick={() => void control.toChat([comment.id])}
    >
      <Icon name="sparkle" />
    </button>
  );
}

export function ChatPickBar({ control, className }: { control: CommentsControl; className?: string }) {
  const count = control.picked.length;
  if (count === 0) return null;
  return (
    <div className={`comments-pick-bar ${className ?? ''}`} role="toolbar" aria-label="Selected comments" data-testid="comments-pick-bar">
      <span className="label">{count} selected</span>
      <button type="button" className="btn small ghost" onClick={control.clearPicked}>
        Clear
      </button>
      <span className="spacer" />
      <button type="button" className="btn small primary" data-testid="send-to-chat" disabled={control.preparing} onClick={() => void control.toChat(control.picked)}>
        <Icon name="chat" size={14} />
        {control.preparing ? 'Preparing…' : `Send ${count} to chat`}
      </button>
    </div>
  );
}

function Section({ title, count, action, children }: { title: string; count: number; action?: ReactNode; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="comments-section" aria-label={title}>
      <h3>
        {title} <span className="count">{count}</span>
        <span className="spacer" />
        {action}
      </h3>
      <ul className="comments-list">{children}</ul>
    </section>
  );
}

function QueuedRow({ comment, index, total, control }: { comment: DesignComment; index: number; total: number; control: CommentsControl }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const save = () => {
    const clean = text.trim();
    setEditing(false);
    if (clean && clean !== comment.text) void control.update(comment.id, { text: clean });
    else setText(comment.text);
  };
  return (
    <li className={`comment-row ${control.openId === comment.id ? 'open' : ''}`} data-testid="comment-row" data-status="queued">
      <PickNum comment={comment} control={control} />
      <div className="comment-row-body">
        <CommentAuthor author={comment.author} />
        {editing ? (
          <input
            aria-label={`Edit comment ${comment.n}`}
            value={text}
            autoFocus
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            onBlur={save}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') {
                event.stopPropagation();
                setText(comment.text);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span className="comment-row-text">{comment.text}</span>
        )}
        <CommentReplies comment={comment} onDelete={(replyId) => void control.removeReply(comment.id, replyId)} />
        <div className="comment-row-foot">
          <span className="comment-row-meta">
            <button type="button" onClick={() => control.setOpenId(comment.id)} aria-label={`Show comment ${comment.n} on the canvas`}>
              {targetLabel(comment)}
            </button>
          </span>
          <div className="comment-row-actions">
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Move comment ${comment.n} up`}
              disabled={index === 0}
              onClick={() => void control.move(comment.id, -1)}
            >
              <Icon name="chevronDown" className="flip" />
            </button>
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Move comment ${comment.n} down`}
              disabled={index === total - 1}
              onClick={() => void control.move(comment.id, 1)}
            >
              <Icon name="chevronDown" />
            </button>
            <FixButton comment={comment} control={control} />
            <button type="button" className="icon-btn small" aria-label={`Edit comment ${comment.n}`} onClick={() => setEditing(true)}>
              <Icon name="pencil" />
            </button>
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Resolve comment ${comment.n}`}
              data-tip="Resolve"
              onClick={() => void control.update(comment.id, { status: 'resolved' })}
            >
              <Icon name="check" />
            </button>
            <button type="button" className="icon-btn small" aria-label={`Delete comment ${comment.n}`} onClick={() => void control.remove(comment.id)}>
              <Icon name="close" />
            </button>
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Send comment ${comment.n} now`}
              disabled={control.sending}
              onClick={() => void control.send([comment.id])}
            >
              <Icon name="arrowUp" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function DoneRow({
  comment,
  control,
  onOpenRun,
  onOpenVersion,
}: { comment: DesignComment; control: CommentsControl } & Pick<Props, 'onOpenRun' | 'onOpenVersion'>) {
  const runId = comment.runId;
  const versionId = comment.versionId;
  return (
    <li className="comment-row" data-testid="comment-row" data-status={comment.status}>
      <PickNum comment={comment} control={control} />
      <div className="comment-row-body">
        <CommentAuthor author={comment.author} />
        <span className="comment-row-text">{comment.text}</span>
        <CommentReplies comment={comment} onDelete={(replyId) => void control.removeReply(comment.id, replyId)} />
        <div className="comment-row-foot">
          <span className="comment-row-meta">
            {comment.status === 'draft' && (
              <button type="button" onClick={() => control.setOpenId(comment.id)} aria-label={`Show comment ${comment.n} on the canvas`}>
                {targetLabel(comment)}
              </button>
            )}
            {runId && (
              <button type="button" onClick={() => onOpenRun(runId)}>
                {comment.status === 'sent' ? 'Running…' : 'Open run'}
              </button>
            )}
            {versionId && (
              <>
                {' · '}
                <button type="button" onClick={() => onOpenVersion(versionId)} data-testid="comment-version-link">
                  Version {versionId.slice(0, 7)}
                </button>
              </>
            )}
          </span>
          <div className="comment-row-actions">
            <FixButton comment={comment} control={control} />
            {comment.status === 'draft' && (
              <button type="button" className="btn small ghost" aria-label={`Resolve comment ${comment.n}`} onClick={() => void control.update(comment.id, { status: 'resolved' })}>
                <Icon name="check" size={14} />
                Resolve
              </button>
            )}
            {comment.status === 'resolved' && (
              <button
                type="button"
                className="btn small ghost"
                aria-label={`Reopen comment ${comment.n}`}
                onClick={() => void control.update(comment.id, { status: 'queued' })}
              >
                <Icon name="undo" size={14} />
                Reopen
              </button>
            )}
            <button type="button" className="icon-btn small" aria-label={`Delete comment ${comment.n}`} onClick={() => void control.remove(comment.id)}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function OrphanRow({ comment, control }: { comment: DesignComment; control: CommentsControl }) {
  const active = control.repinId === comment.id;
  return (
    <li className="comment-row" data-testid="comment-row" data-status="orphaned">
      <PickNum comment={comment} control={control} />
      <div className="comment-row-body">
        <span className="comment-row-text">{comment.text}</span>
        <CommentReplies comment={comment} onDelete={(replyId) => void control.removeReply(comment.id, replyId)} />
        <div className="comment-row-foot">
          <span className="comment-row-meta">Element not found: {targetLabel(comment)}</span>
          <div className="comment-row-actions">
            <FixButton comment={comment} control={control} />
            <button type="button" className="btn small" aria-pressed={active} onClick={() => control.setRepinId(active ? null : comment.id)}>
              {active ? 'Pick an element…' : 'Re-pin'}
            </button>
            <button type="button" className="icon-btn small" aria-label={`Delete comment ${comment.n}`} onClick={() => void control.remove(comment.id)}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function SendQueuedButton({ control, className }: { control: CommentsControl; className?: string }) {
  const count = control.queued.length;
  return (
    <button type="button" className={`btn small primary ${className ?? ''}`} disabled={count === 0 || control.sending} onClick={() => void control.send()}>
      {control.sending ? 'Sending…' : `Send ${count} queued`}
    </button>
  );
}

function composerTarget(selection: SelectionContext[]): string | null {
  if (selection.length === 0) return null;
  if (selection.length > 1) return `${selection.length} elements`;
  const first = selection[0];
  return first ? `the ${first.tag}` : null;
}

function CommentsComposer({ control, selection }: { control: CommentsControl; selection: SelectionContext[] }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const target = composerTarget(selection);
  const ready = target !== null && text.trim().length > 0 && !busy;
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      if (await control.add(selection, text.trim(), false)) setText('');
    } finally {
      setBusy(false);
    }
  };
  const queued = control.queued.length;
  return (
    <div className="comments-composer ui-composer" data-testid="comments-composer">
      <textarea
        aria-label="Add a comment"
        rows={2}
        maxLength={2000}
        value={text}
        disabled={target === null}
        placeholder={target ? `Add a comment on ${target}…` : 'Click an element on the canvas to comment.'}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <div className="comments-composer-row">
        {queued > 0 && <SendQueuedButton control={control} className="ghost" />}
        <span className="spacer" />
        <button type="button" className="btn small send" disabled={!ready} onClick={() => void submit()}>
          <Icon name="arrowUp" size={12} />
          Comment
        </button>
      </div>
    </div>
  );
}

export function CommentsPanel({ control, running, onOpenRun, onOpenVersion, selection = [] }: Props) {
  const by = (status: DesignComment['status']) => control.comments.filter((comment) => comment.status === status);
  const sent = by('sent');
  const resolved = by('resolved');
  const orphaned = by('orphaned');
  const queued = control.queued;
  const outside = control.comments.filter((comment) => comment.status === 'draft' && comment.author);
  const empty = control.comments.filter((comment) => comment.status !== 'draft' || comment.author).length === 0;
  const showResolved = control.showResolved;
  return (
    <div className="comments-pane">
    <div className="comments-panel" data-testid="comments-panel">
      {control.notice && (
        <div className="comments-notice" role="status">
          <span>{control.notice}</span>
          <button type="button" className="icon-btn small" aria-label="Dismiss notice" onClick={control.clearNotice}>
            <Icon name="close" />
          </button>
        </div>
      )}
      <ChatPickBar control={control} />
      {empty && (
        <p className="comments-empty">No comments yet. Click an element on the canvas to pin one. Select several by their numbers, then send them to the chat.</p>
      )}
      {resolved.length > 0 && (
        <div className="comments-filter">
          <label>
            <input type="checkbox" checked={showResolved} onChange={(event) => control.setShowResolved(event.target.checked)} />
            Show resolved
          </label>
          {!showResolved && (
            <span className="count" data-testid="resolved-hidden">
              {resolved.length} hidden
            </span>
          )}
        </div>
      )}
      <Section title="From outside agents" count={outside.length}>
        {outside.map((comment) => (
          <DoneRow key={comment.id} comment={comment} control={control} onOpenRun={onOpenRun} onOpenVersion={onOpenVersion} />
        ))}
      </Section>
      <Section title="Queued" count={queued.length}>
        {queued.map((comment, index) => (
          <QueuedRow key={comment.id} comment={comment} index={index} total={queued.length} control={control} />
        ))}
      </Section>
      <Section title="In chat" count={control.inChat.length}>
        {control.inChat.map((comment, index) => (
          <QueuedRow key={comment.id} comment={comment} index={index} total={control.inChat.length} control={control} />
        ))}
      </Section>
      {running && queued.length > 0 && <p className="comments-empty">The agent is running. Queued comments wait until it finishes.</p>}
      <Section title="Sent" count={sent.length}>
        {sent.map((comment) => (
          <DoneRow key={comment.id} comment={comment} control={control} onOpenRun={onOpenRun} onOpenVersion={onOpenVersion} />
        ))}
      </Section>
      <Section title="Orphaned" count={orphaned.length}>
        {orphaned.map((comment) => (
          <OrphanRow key={comment.id} comment={comment} control={control} />
        ))}
      </Section>
      <Section title="Resolved" count={showResolved ? resolved.length : 0}>
        {resolved.map((comment) => (
          <DoneRow key={comment.id} comment={comment} control={control} onOpenRun={onOpenRun} onOpenVersion={onOpenVersion} />
        ))}
      </Section>
    </div>
    <CommentsComposer control={control} selection={selection} />
    </div>
  );
}

export function QueuedComposerBar({ control, onShow }: { control: CommentsControl; onShow: () => void }) {
  const count = control.queued.length;
  if (count === 0 && !control.notice) return null;
  return (
    <div className="comments-queue-bar" data-testid="queued-bar">
      <span className="label">
        <button type="button" className="link" onClick={onShow}>
          {count} queued
        </button>
        {control.notice && <span className="notice"> · {control.notice}</span>}
      </span>
      {count > 0 && <SendQueuedButton control={control} />}
    </div>
  );
}
