import { useEffect, useRef, useState } from 'react';
import type { McpApprovalOutcome } from '../../shared/contracts';
import { mcpApi } from '../mcpApi';
import type { McpApprovalCard } from '../useMcpFeed';
import { Icon } from './Icon';
import { McpApproval } from './McpFeed';
import '../styles/mcp.css';

const WAIT_S = 25;
const IDLE_MS = 15_000;
const RETRY_MS = 5_000;
const DONE_MS = 5_000;

function useApprovalPoll(): [McpApprovalCard[], (id: string, outcome: McpApprovalOutcome) => void, (id: string) => void] {
  const [cards, setCards] = useState<McpApprovalCard[]>([]);
  const answered = useRef(new Map<string, McpApprovalOutcome>());
  useEffect(() => {
    let live = true;
    let timer = 0;
    let seen = '';
    const settle = (ids: Set<string>) =>
      setCards((prev) =>
        prev.map((card) => {
          if (card.outcome || ids.has(card.approval.id)) return card;
          const outcome = answered.current.get(card.approval.id) ?? (Date.now() >= card.approval.expiresAt - 1000 ? 'timeout' : 'closed');
          return { ...card, outcome };
        }),
      );
    const loop = () => {
      mcpApi
        .approvals(seen, WAIT_S)
        .then((res) => {
          if (!live) return;
          const ids = new Set(res.pending.map((item) => item.id));
          seen = res.pending.map((item) => item.id).join(',');
          settle(ids);
          setCards((prev) => [...prev, ...res.pending.filter((item) => !prev.some((card) => card.approval.id === item.id)).map((approval) => ({ approval, outcome: null }))]);
          timer = window.setTimeout(loop, res.edits ? 0 : IDLE_MS);
        })
        .catch(() => {
          if (live) timer = window.setTimeout(loop, RETRY_MS);
        });
    };
    loop();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);
  const mark = (id: string, outcome: McpApprovalOutcome) => {
    answered.current.set(id, outcome);
    setCards((prev) => prev.map((card) => (card.approval.id === id ? { ...card, outcome } : card)));
  };
  const drop = (id: string) => setCards((prev) => prev.filter((card) => card.approval.id !== id));
  return [cards, mark, drop];
}

function Toast({ card, onAnswer, onDrop }: { card: McpApprovalCard; onAnswer: (allow: boolean) => void; onDrop: () => void }) {
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  useEffect(() => {
    if (!card.outcome) return;
    const timer = window.setTimeout(() => dropRef.current(), DONE_MS);
    return () => window.clearTimeout(timer);
  }, [card.outcome]);
  return (
    <div className="mcp-toast" data-testid="mcp-toast">
      <div className="mcp-toast-head">
        <span>{card.outcome ? card.approval.client || 'MCP client' : `${card.approval.client || 'MCP client'} needs your answer`}</span>
        <span className="spacer" />
        <button type="button" className="icon-btn small" aria-label="Hide" onClick={onDrop}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <McpApproval card={card} compact onAnswer={onAnswer} />
    </div>
  );
}

export default function McpToasts({ openProjectId }: { openProjectId: string | null }) {
  const [cards, mark, drop] = useApprovalPoll();
  const shown = cards.filter((card) => card.approval.projectId === null || card.approval.projectId !== openProjectId);
  if (shown.length === 0) return null;
  return (
    <div className="mcp-toasts" role="status" aria-live="polite">
      {shown.map((card) => (
        <Toast key={card.approval.id} card={card} onAnswer={(allow) => mark(card.approval.id, allow ? 'allow' : 'deny')} onDrop={() => drop(card.approval.id)} />
      ))}
    </div>
  );
}
