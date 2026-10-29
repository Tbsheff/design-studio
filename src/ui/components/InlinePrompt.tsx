import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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

export default function InlinePrompt({ view, zoom, frame }: Props) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  const { rect } = view;
  const above = rect.y + rect.height + BOX_ROOM / zoom > frame.height && rect.y > BOX_ROOM / zoom;
  const left = Math.max(0, Math.min(rect.x, frame.width - BOX_WIDTH / zoom));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      view.close();
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      view.submit(text);
    }
  };
  const ready = text.trim().length > 0 && !view.blocked;
  return (
    <div
      className="inline-prompt"
      data-testid="inline-prompt"
      style={{ left, top: above ? rect.y : rect.y + rect.height, transform: `scale(${1 / zoom}) translateY(${above ? 'calc(-100% - 8px)' : '8px'})` }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
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
        onKeyUp={(event) => event.stopPropagation()}
      />
      <button type="button" className="inline-prompt-send" disabled={!ready} data-tip={view.blocked ?? 'Send (Enter)'} aria-label="Send" onClick={() => view.submit(text)}>
        ↵
      </button>
    </div>
  );
}
