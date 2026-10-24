import { useRef, type KeyboardEvent } from 'react';
import type { QueuedMessage } from '../shared/contracts';

export const QUEUE_MAX = 20;

let queueCounter = 0;

function newQueued(text: string): QueuedMessage {
  queueCounter += 1;
  return { id: `q${Date.now().toString(36)}${queueCounter}`, text };
}

interface Options {
  draft: string;
  setDraft: (value: string) => void;
  running: boolean;
  blocked: boolean;
  queue: QueuedMessage[] | undefined;
  history: string[] | undefined;
  onQueueChange: ((items: QueuedMessage[]) => void) | undefined;
  onSteer: ((text: string) => void) | undefined;
}

const NONE: QueuedMessage[] = [];
const NO_HISTORY: string[] = [];

function onFirstLine(area: HTMLTextAreaElement): boolean {
  return !area.value.slice(0, area.selectionStart).includes('\n');
}

export function useComposerKeys(options: Options) {
  const historyIndex = useRef(-1);
  const { draft, setDraft, running } = options;
  const queue = options.queue ?? NONE;
  const history = options.history ?? NO_HISTORY;
  const canQueue = running && draft.trim().length > 0 && !options.blocked && queue.length < QUEUE_MAX;
  const queueDraft = () => {
    if (!canQueue || !options.onQueueChange) return;
    options.onQueueChange([...queue, newQueued(draft.trim())]);
    setDraft('');
  };
  const steerDraft = () => {
    if (!canQueue || !options.onSteer) return;
    options.onSteer(draft.trim());
    setDraft('');
  };
  const recall = (step: 1 | -1): boolean => {
    const next = historyIndex.current + step;
    if (next < -1 || next >= history.length) return false;
    historyIndex.current = next;
    setDraft(next === -1 ? '' : (history[history.length - 1 - next] ?? ''));
    return true;
  };
  const historyKey = (event: KeyboardEvent<HTMLDivElement>, area: HTMLTextAreaElement): boolean => {
    if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return false;
    if (event.key === 'ArrowUp' && (draft === '' || (historyIndex.current >= 0 && onFirstLine(area)))) return recall(1);
    if (event.key === 'ArrowDown' && historyIndex.current >= 0) return recall(-1);
    return false;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLTextAreaElement) || !target.matches('[data-slot="composer-input"]') || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey && running) {
      event.preventDefault();
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey) steerDraft();
      else queueDraft();
      return;
    }
    if (historyKey(event, target)) event.preventDefault();
  };
  const setQueue = (items: QueuedMessage[]) => options.onQueueChange?.(items);
  return { canQueue, queue, setQueue, queueDraft, onKeyDown, resetHistory: () => (historyIndex.current = -1) };
}
