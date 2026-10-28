import { createContext, useContext, useState } from 'react';
import type { DesignComment, RunRequest } from '../../shared/contracts';
import { commentsDone } from '../../shared/comments';
import type { RunView } from '../runState';
import type { CommentsControl } from '../useComments';
import { Icon } from './Icon';

export const RunCommentsContext = createContext<CommentsControl | null>(null);

function idsOf(request: RunRequest | null | undefined): string[] {
  if (!request) return [];
  return [...(request.comments ?? []).map((comment) => comment.id), ...(request.commentIds ?? [])];
}

function replyText(run: RunView): string {
  if (run.summary?.finalText) return run.summary.finalText;
  return run.parts.flatMap((part) => (part.kind === 'text' ? [part.text] : [])).join('\n');
}

type LinkState = 'done' | 'resolved' | 'open';

function stateOf(comment: DesignComment, done: number[]): LinkState {
  if (comment.status === 'resolved') return 'resolved';
  return done.includes(comment.n) ? 'done' : 'open';
}

const STATE_TIP: Record<LinkState, string> = { done: 'The agent says it did this', resolved: 'Resolved', open: 'Still open' };

function CommentLink({ comment, state, control }: { comment: DesignComment; state: LinkState; control: CommentsControl }) {
  return (
    <li>
      <button type="button" className="run-comment-link" data-state={state} data-testid="run-comment-link" data-tip={`${STATE_TIP[state]}. Show it on the canvas.`} onClick={() => control.setOpenId(comment.id)}>
        <span className="num">{state === 'resolved' || state === 'done' ? <Icon name="check" size={12} /> : null}#{comment.n}</span>
        <span className="text">{comment.text}</span>
      </button>
    </li>
  );
}

function resolvable(linked: DesignComment[], done: number[]): DesignComment[] {
  const open = linked.filter((comment) => comment.status !== 'resolved' && comment.status !== 'sent');
  return done.length > 0 ? open.filter((comment) => done.includes(comment.n)) : open;
}

export function RunCommentsCard({ run }: { run: RunView }) {
  const control = useContext(RunCommentsContext);
  const [busy, setBusy] = useState(false);
  const ids = new Set([...idsOf(run.summary?.request), ...idsOf(run.request)]);
  if (!control || ids.size === 0 || run.status === 'running') return null;
  const linked = control.comments.filter((comment) => ids.has(comment.id));
  if (linked.length === 0) return null;
  const done = commentsDone(replyText(run));
  const toResolve = run.status === 'completed' ? resolvable(linked, done) : [];
  const resolve = async () => {
    setBusy(true);
    try {
      for (const comment of toResolve) await control.update(comment.id, { status: 'resolved' });
    } finally {
      setBusy(false);
    }
  };
  const noun = toResolve.length === 1 ? 'comment' : 'comments';
  return (
    <section className="run-comments" aria-label="Comments in this run" data-testid="run-comments">
      <div className="run-comments-head">
        <Icon name="comment" size={14} />
        <span>
          {linked.length} {linked.length === 1 ? 'comment' : 'comments'} in this run
        </span>
        <span className="spacer" />
        {toResolve.length > 0 && (
          <button type="button" className="btn small primary" data-testid="resolve-run-comments" disabled={busy} onClick={() => void resolve()}>
            <Icon name="check" size={14} />
            Resolve {toResolve.length} {noun}
          </button>
        )}
      </div>
      <ul className="run-comments-list">
        {linked.map((comment) => (
          <CommentLink key={comment.id} comment={comment} state={stateOf(comment, done)} control={control} />
        ))}
      </ul>
    </section>
  );
}
