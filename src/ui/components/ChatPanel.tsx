import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Direction } from '../../shared/contracts';
import { forkBaseOf, runMatches, runQueryTerms } from '../../shared/rewind';
import { renameRun } from '../runHistoryApi';
import type { RewindControl } from '../useRewind';
import { Conversation, ConversationContent, ConversationScrollButton, useConversation } from '../ai/components/ai/conversation';
import { Message, MessageContent } from '../ai/components/ai/message';
import { canPolishRun } from '../polish';
import type { RunView, ToolRow } from '../runState';
import { AssistantText, PlanCard, PolishThis, RunError, RunFoot, SentWhileRunning, Thinking, UserMessage } from './ChatParts';
import { UserTurn, type TurnActions } from './ChatRewind';
import { ChatSearch } from './ChatSearch';
import { Icon } from './Icon';
import { LiveStatus, RunChanges, ToolChips } from './ToolChips';
import { PermissionPrompt } from './PermissionPrompt';

interface PolishProps {
  headVersionId: string | null;
  running: boolean;
  onPolish: () => void;
  onRetry?: (run: RunView) => void;
  onApprovePlan?: (run: RunView) => void;
}

type Segment =
  | { kind: 'text'; key: string; text: string; open: boolean }
  | { kind: 'thinking'; key: string; text: string; open: boolean }
  | { kind: 'tools'; key: string; tools: ToolRow[] }
  | { kind: 'user'; key: string; text: string };

function segmentsOf(run: RunView): Segment[] {
  const byId = new Map(run.tools.map((tool) => [tool.toolUseId, tool]));
  const segments: Segment[] = [];
  run.parts.forEach((part, index) => {
    if (part.kind === 'tool') {
      const tool = byId.get(part.toolUseId);
      if (!tool) return;
      const last = segments.at(-1);
      if (last?.kind === 'tools') last.tools.push(tool);
      else segments.push({ kind: 'tools', key: `tools-${part.toolUseId}`, tools: [tool] });
    } else if (part.kind === 'user') segments.push({ kind: 'user', key: `user-${part.id}`, text: part.text });
    else segments.push({ kind: part.kind, key: `${part.kind}-${index}`, text: part.text, open: Boolean(part.open) });
  });
  return segments;
}

const ToolSegment = memo(
  function ToolSegment({ tools, running, workTree }: { tools: ToolRow[]; running: boolean; workTree: string | null }) {
    return <ToolChips tools={tools} running={running} workTree={workTree} />;
  },
  (a, b) => a.running === b.running && a.workTree === b.workTree && a.tools.length === b.tools.length && a.tools.every((tool, index) => tool === b.tools[index]),
);

function RunParts({ run, running, workTree }: { run: RunView; running: boolean; workTree: string | null }) {
  return (
    <>
      {segmentsOf(run).map((segment) => {
        if (segment.kind === 'tools') return <ToolSegment key={segment.key} tools={segment.tools} running={running} workTree={workTree} />;
        if (segment.kind === 'user') return <SentWhileRunning key={segment.key} text={segment.text} />;
        if (segment.kind === 'thinking') return <Thinking key={segment.key} text={segment.text} live={running && segment.open} />;
        return <AssistantText key={segment.key} text={segment.text} streaming={running && segment.open} />;
      })}
    </>
  );
}

interface TurnProps {
  title: string | undefined;
  restoreTip: string | null;
  restoreVersionId: string | null;
  forkBase: string | null;
  editTip: string | null;
  actions: TurnActions | null;
}

interface EntryProps extends TurnProps {
  run: RunView;
  latest: boolean;
  workTree: string | null;
  onDetails: (runId: string) => void;
  polish: PolishProps;
}

const RunEntry = memo(function RunEntry({ run, latest, workTree, onDetails, polish, title, restoreTip, restoreVersionId, forkBase, editTip, actions }: EntryProps) {
  const runId = run.runId;
  const details = useCallback(() => onDetails(runId), [onDetails, runId]);
  const running = run.status === 'running';
  const rewind = useMemo(() => ({ restoreTip, restoreVersionId, forkBase, editTip }), [restoreTip, restoreVersionId, forkBase, editTip]);
  return (
    <div className="run flex min-w-0 flex-col gap-3" data-run-id={runId}>
      <UserTurn run={run} title={title} rewind={actions ? rewind : null} actions={actions} />
      <Message type="incoming" className="msg assistant">
        <MessageContent className="run-body gap-2">
          <RunParts run={run} running={running} workTree={workTree} />
          {running && run.permissions.map((request) => <PermissionPrompt key={request.id} runId={runId} request={request} />)}
          {running && <LiveStatus run={run} workTree={workTree} />}
          <RunError run={run} latest={latest} {...(polish.onRetry ? { onRetry: () => polish.onRetry?.(run) } : {})} />
          {!running && <RunChanges tools={run.tools} />}
          <RunFoot run={run} onDetails={details} />
          {latest && run.status === 'completed' && run.request?.plan && polish.onApprovePlan && <PlanCard onApprove={() => polish.onApprovePlan?.(run)} />}
          {canPolishRun(run, polish.headVersionId) && <PolishThis disabled={polish.running} onPolish={polish.onPolish} />}
        </MessageContent>
      </Message>
    </div>
  );
});

function PendingEntry({ run, workTree }: { run: RunView; workTree: string | null }) {
  return (
    <div className="run flex min-w-0 flex-col gap-3" data-pending-run="">
      <UserMessage run={run} />
      <Message type="incoming" className="msg assistant">
        <MessageContent className="run-body gap-2">
          <LiveStatus run={run} workTree={workTree} />
        </MessageContent>
      </Message>
    </div>
  );
}

function StickOnNewRun({ runId }: { runId: string | null }) {
  const { stickToBottom } = useConversation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (runId) stickToBottom();
  }, [runId, stickToBottom]);
  return null;
}

function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function EmptyChat() {
  return (
    <div className="chat-empty">
      <span className="chat-empty-icon">
        <Icon name="sparkle" size={18} />
      </span>
      <strong>No runs in this direction yet</strong>
      <p>Describe a change below. To target one part, press V, then click an element in the preview.</p>
    </div>
  );
}

const WAIT_TIP = 'Wait for the run to finish';

function turnProps(run: RunView, rewind: RewindControl | undefined, title: string | undefined, actions: TurnActions | null): TurnProps {
  if (!rewind || !actions) return { title, restoreTip: null, restoreVersionId: null, forkBase: null, editTip: null, actions: null };
  const running = run.status === 'running' || !run.summary;
  const versionId = run.summary?.versionId ?? null;
  const forkBase = running ? null : forkBaseOf({ versionId, startedAt: run.startedAt }, rewind.versions);
  const restoreTip = running || rewind.locked ? WAIT_TIP : versionId === null ? 'This message made no version' : versionId === rewind.headVersionId || versionId === rewind.headRestoredFrom ? 'The code is already at this message' : null;
  const editTip = running ? WAIT_TIP : forkBase === null ? 'No earlier version to start from' : null;
  return { title, restoreTip, restoreVersionId: restoreTip === null ? versionId : null, forkBase, editTip, actions };
}

function useRunSearch(runs: RunView[], titles: Record<string, string>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const terms = useMemo(() => runQueryTerms(query), [query]);
  const shown = useMemo(
    () => (terms.length === 0 ? runs : runs.filter((run) => runMatches(terms, run.request?.prompt ?? '', titles[run.runId] ?? run.summary?.title))),
    [runs, terms, titles],
  );
  return {
    open,
    query,
    shown,
    active: terms.length > 0,
    onOpen: () => setOpen(true),
    onClose: () => {
      setOpen(false);
      setQuery('');
    },
    onQuery: setQuery,
  };
}

interface Props {
  rewind?: RewindControl;
  runs: RunView[];
  pending?: RunView | null;
  direction: Direction | null;
  onDetails: (runId: string) => void;
  running: boolean;
  busy: boolean;
  onPolish: () => void;
  onRetry?: (run: RunView) => void;
  onApprovePlan?: (run: RunView) => void;
}

export function ChatPanel({ runs, pending = null, direction, onDetails, running, busy, onPolish, onRetry, onApprovePlan, rewind }: Props) {
  const workTree = direction?.workTree ?? null;
  const headVersionId = direction?.headVersionId ?? null;
  const detailsRef = useLatest(onDetails);
  const polishRef = useLatest(onPolish);
  const retryRef = useLatest(onRetry);
  const retry = useCallback((run: RunView) => retryRef.current?.(run), [retryRef]);
  const approveRef = useLatest(onApprovePlan);
  const approve = useCallback((run: RunView) => approveRef.current?.(run), [approveRef]);
  const openDetails = useCallback((runId: string) => detailsRef.current(runId), [detailsRef]);
  const startPolish = useCallback(() => polishRef.current(), [polishRef]);
  const polishing = running || busy;
  const polish = useMemo(() => ({ headVersionId, running: polishing, onPolish: startPolish, onRetry: retry, onApprovePlan: approve }), [headVersionId, polishing, startPolish, retry, approve]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const rewindRef = useLatest(rewind);
  const hasRewind = rewind !== undefined;
  const actions = useMemo<TurnActions | null>(
    () =>
      hasRewind
        ? {
            onRestore: (versionId) => rewindRef.current?.onRestore(versionId),
            onEditResend: (run, prompt, base) => rewindRef.current?.onEditResend(run, prompt, base) ?? Promise.resolve(),
            dirtyCount: () => rewindRef.current?.dirtyCount ?? 0,
            onRename: async (runId, title) => {
              const summary = await renameRun(runId, title);
              setTitles((prev) => ({ ...prev, [runId]: summary.title ?? '' }));
            },
          }
        : null,
    [hasRewind, rewindRef],
  );
  const search = useRunSearch(runs, titles);
  const lastId = runs.at(-1)?.runId;
  return (
    <div className="chat-wrap">
      {runs.length > 1 && <ChatSearch open={search.open} query={search.query} shown={search.shown.length} total={runs.length} onOpen={search.onOpen} onClose={search.onClose} onQuery={search.onQuery} />}
      <Conversation className="chat-conversation min-h-0 flex-1" data-ai-scope="" data-searching={search.open || undefined}>
        <ConversationContent className="chat">
          {runs.length === 0 && !pending && <EmptyChat />}
          {search.active && search.shown.length === 0 && <p className="chat-search-empty">No run matches “{search.query.trim()}”.</p>}
          {search.shown.map((r) => (
            <RunEntry key={r.runId} run={r} latest={r.runId === lastId} workTree={workTree} onDetails={openDetails} polish={polish} {...turnProps(r, rewind, titles[r.runId] ?? r.summary?.title, actions)} />
          ))}
          {pending && <PendingEntry run={pending} workTree={workTree} />}
        </ConversationContent>
        <StickOnNewRun runId={pending?.runId ?? runs.at(-1)?.runId ?? null} />
        <ConversationScrollButton className="icon-btn chat-scroll-btn">
          <Icon name="chevronDown" size={16} />
        </ConversationScrollButton>
      </Conversation>
    </div>
  );
}
