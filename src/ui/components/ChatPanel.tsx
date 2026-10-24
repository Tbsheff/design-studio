import { memo, useCallback, useMemo, useRef } from 'react';
import type { Direction } from '../../shared/contracts';
import { Conversation, ConversationContent, ConversationScrollButton } from '../ai/components/ai/conversation';
import { Message, MessageContent } from '../ai/components/ai/message';
import { canPolishRun } from '../polish';
import type { RunView, ToolRow } from '../runState';
import { AssistantText, PolishThis, RunError, RunFoot, SentWhileRunning, Thinking, UserMessage } from './ChatParts';
import { Icon } from './Icon';
import { LiveStatus, RunChanges, ToolChips } from './ToolChips';
import { PermissionPrompt } from './PermissionPrompt';

interface PolishProps {
  headVersionId: string | null;
  running: boolean;
  onPolish: () => void;
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

const RunEntry = memo(function RunEntry({ run, latest, workTree, onDetails, polish }: { run: RunView; latest: boolean; workTree: string | null; onDetails: (runId: string) => void; polish: PolishProps }) {
  const runId = run.runId;
  const details = useCallback(() => onDetails(runId), [onDetails, runId]);
  const running = run.status === 'running';
  return (
    <div className="run flex min-w-0 flex-col gap-3" data-run-id={runId}>
      <UserMessage run={run} />
      <Message type="incoming" className="msg assistant">
        <MessageContent className="run-body gap-2">
          <RunParts run={run} running={running} workTree={workTree} />
          {running && run.permissions.map((request) => <PermissionPrompt key={request.id} runId={runId} request={request} />)}
          {running && <LiveStatus run={run} workTree={workTree} />}
          <RunError run={run} latest={latest} />
          {!running && <RunChanges tools={run.tools} />}
          <RunFoot run={run} onDetails={details} />
          {canPolishRun(run, polish.headVersionId) && <PolishThis disabled={polish.running} onPolish={polish.onPolish} />}
        </MessageContent>
      </Message>
    </div>
  );
});

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

interface Props {
  runs: RunView[];
  direction: Direction | null;
  onDetails: (runId: string) => void;
  running: boolean;
  busy: boolean;
  onPolish: () => void;
}

export function ChatPanel({ runs, direction, onDetails, running, busy, onPolish }: Props) {
  const workTree = direction?.workTree ?? null;
  const headVersionId = direction?.headVersionId ?? null;
  const detailsRef = useLatest(onDetails);
  const polishRef = useLatest(onPolish);
  const openDetails = useCallback((runId: string) => detailsRef.current(runId), [detailsRef]);
  const startPolish = useCallback(() => polishRef.current(), [polishRef]);
  const polishing = running || busy;
  const polish = useMemo(() => ({ headVersionId, running: polishing, onPolish: startPolish }), [headVersionId, polishing, startPolish]);
  return (
    <Conversation className="chat-conversation min-h-0 flex-1" data-ai-scope="">
      <ConversationContent className="chat">
        {runs.length === 0 && <EmptyChat />}
        {runs.map((r, i) => (
          <RunEntry key={r.runId} run={r} latest={i === runs.length - 1} workTree={workTree} onDetails={openDetails} polish={polish} />
        ))}
      </ConversationContent>
      <ConversationScrollButton className="icon-btn chat-scroll-btn">
        <Icon name="chevronDown" size={16} />
      </ConversationScrollButton>
    </Conversation>
  );
}
