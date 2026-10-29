import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { STUDIO_TOKEN_HEADER } from '../../shared/contracts';
import type { ComponentUsage, EditScope, EditScopeChoice } from '../../shared/usage-scope';
import { getSession } from '../session';
import { uiStore } from '../storage';
import type { InlinePromptView } from '../useInlinePrompt';
import { Icon } from './Icon';
import '../styles/inline-prompt.css';

const BOX_ROOM = 48;
const BOX_WIDTH = 320;

interface Props {
  view: InlinePromptView;
  zoom: number;
  frame: { width: number; height: number };
}

function useUsage(file: string | null): ComponentUsage | null {
  const [usage, setUsage] = useState<ComponentUsage | null>(null);
  useEffect(() => {
    setUsage(null);
    const projectId = uiStore.get().activeProjectId;
    if (!file || !projectId) return;
    const abort = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(projectId)}/usage?file=${encodeURIComponent(file)}`, { headers: { [STUDIO_TOKEN_HEADER]: getSession().token }, signal: abort.signal })
      .then((res) => (res.ok ? (res.json() as Promise<ComponentUsage>) : null))
      .then((data) => setUsage(data))
      .catch(() => undefined);
    return () => abort.abort();
  }, [file]);
  return usage;
}

function scopeOf(usage: ComponentUsage | null, choice: EditScopeChoice): EditScope | undefined {
  if (!usage || usage.routes.length < 2) return undefined;
  return { choice, file: usage.file, component: usage.component, routes: usage.routes.map((route) => route.route) };
}

interface ScopeProps {
  usage: ComponentUsage;
  choice: EditScopeChoice;
  onChoice: (choice: EditScopeChoice) => void;
}

function ScopeChoice({ usage, choice, onChoice }: ScopeProps) {
  const name = usage.component ?? usage.file;
  const options: { id: EditScopeChoice; label: string; tip: string }[] = [
    { id: 'this', label: 'This use', tip: `Change only this page. ${name} stays as it is.` },
    { id: 'all', label: `All uses (${usage.routes.length})`, tip: `Change ${name} on all ${usage.routes.length} routes` },
  ];
  return (
    <div className="inline-prompt-scope" role="radiogroup" aria-label={`Where to change ${name}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={choice === option.id}
          className={choice === option.id ? 'on' : undefined}
          data-tip={option.tip}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChoice(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function InlinePrompt({ view, zoom, frame }: Props) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<EditScopeChoice>('this');
  const input = useRef<HTMLInputElement>(null);
  const usage = useUsage(view.usageFile);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  const { rect } = view;
  const above = rect.y + rect.height + BOX_ROOM / zoom > frame.height && rect.y > BOX_ROOM / zoom;
  const left = Math.max(0, Math.min(rect.x, frame.width - BOX_WIDTH / zoom));
  const submit = () => view.submit(text, scopeOf(usage, choice));
  const onBoxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      view.close();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };
  const ready = text.trim().length > 0 && !view.blocked;
  const shared = usage && usage.routes.length > 1 ? usage : null;
  return (
    <div
      className="inline-prompt"
      data-testid="inline-prompt"
      style={{ left, top: above ? rect.y : rect.y + rect.height, transform: `scale(${1 / zoom}) translateY(${above ? 'calc(-100% - 8px)' : '8px'})` }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={onBoxKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <div className="inline-prompt-row">
        <span className="inline-prompt-target" data-tip="The run edits this selection">
          <Icon name="sparkle" size={12} />
          {view.label}
        </span>
        <input
          ref={input}
          className="inline-prompt-input"
          value={text}
          placeholder={view.blocked ?? 'Ask for a change…'}
          aria-label={`Ask the agent about ${view.label}`}
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="inline-prompt-send" disabled={!ready} data-tip={view.blocked ?? 'Send (Enter)'} aria-label="Send" onClick={submit}>
          ↵
        </button>
      </div>
      {shared ? <ScopeChoice usage={shared} choice={choice} onChoice={setChoice} /> : null}
    </div>
  );
}
