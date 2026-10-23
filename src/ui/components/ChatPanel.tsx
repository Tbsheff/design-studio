import type { Direction } from '../../shared/contracts';
import { Conversation, ConversationContent, ConversationScrollButton } from '../ai/components/ai/conversation';
import { Message, MessageContent } from '../ai/components/ai/message';
import { canPolishRun } from '../polish';
import { runText, type RunView } from '../runState';
import { AssistantText, PolishThis, RunError, RunFoot, Thinking, UserMessage } from './ChatParts';
import { Icon } from './Icon';
import { LiveStatus, ToolChips } from './ToolChips';

interface PolishProps {
  headVersionId: string | null;
  running: boolean;
  onPolish: () => void;
}

function RunEntry({ run, latest, workTree, onDetails, polish }: { run: RunView; latest: boolean; workTree: string | null; onDetails: () => void; polish: PolishProps }) {
  const text = runText(run);
  const running = run.status === 'running';
  return (
    <div className="run flex min-w-0 flex-col gap-3">
      <UserMessage run={run} />
      <Message type="incoming" className="msg assistant">
        <MessageContent className="gap-2">
          <Thinking text={run.thinking} running={running && !text} />
          <ToolChips tools={run.tools} running={running} workTree={workTree} />
          {text && <AssistantText text={text} />}
          {running && <LiveStatus run={run} hasText={Boolean(text)} workTree={workTree} />}
          <RunError run={run} latest={latest} />
          <RunFoot run={run} onDetails={onDetails} />
          {canPolishRun(run, polish.headVersionId) && <PolishThis disabled={polish.running} onPolish={polish.onPolish} />}
        </MessageContent>
      </Message>
    </div>
  );
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
  const polish = { headVersionId: direction?.headVersionId ?? null, running: running || busy, onPolish };
  return (
    <Conversation className="chat-conversation min-h-0 flex-1" data-ai-scope="">
      <ConversationContent className="chat">
        {runs.length === 0 && <EmptyChat />}
        {runs.map((r, i) => (
          <RunEntry key={r.runId} run={r} latest={i === runs.length - 1} workTree={workTree} onDetails={() => onDetails(r.runId)} polish={polish} />
        ))}
      </ConversationContent>
      <ConversationScrollButton className="icon-btn chat-scroll-btn">
        <Icon name="chevronDown" size={16} />
      </ConversationScrollButton>
    </Conversation>
  );
}
