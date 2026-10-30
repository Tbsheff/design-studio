import { useCallback, useEffect, useRef, useState } from 'react';
import { matchesKey } from '../shared/keymap';
import type { SelectionContext } from '../shared/contracts';
import type { EditScope, InlineRunExtras } from '../shared/usage-scope';
import { useCommands } from './commands/registry';
import { IS_MAC } from './commands/keys';
import { isTypingTarget } from './typingTarget';
import { unionRect } from './useCanvasFrames';

export const INLINE_PROMPT_COMMAND = 'selection.ask-inline';

export interface InlinePromptOptions {
  selection: SelectionContext[];
  live: boolean;
  running: boolean | undefined;
  onSubmit: ((prompt: string, extras?: InlineRunExtras) => void) | null | undefined;
  stage: () => HTMLElement | null;
  route?: string | null | undefined;
}

export interface InlinePromptView {
  rect: NonNullable<ReturnType<typeof unionRect>>;
  label: string;
  blocked: string | null;
  usageFile: string | null;
  usedAtFile: string | null;
  route: string | null;
  submit: (prompt: string, editScope?: EditScope) => void;
  close: () => void;
}

function blockerOf(o: InlinePromptOptions): string | null {
  if (!o.onSubmit) return 'Open a direction first';
  if (!o.live) return 'Go back to the live canvas first';
  if (o.selection.length === 0) return 'Select an element first';
  return o.running ? 'Wait for the current run to finish' : null;
}

const SNIPPET_MAX = 16;
export const INLINE_PROMPT_OPEN_EVENT = 'studio:inline-prompt-open';

function labelOf(selection: SelectionContext[]): string {
  const last = selection.at(-1);
  if (selection.length > 1) return `${selection.length} elements`;
  if (last?.component) return last.component;
  const text = last?.text.replace(/\s+/g, ' ').trim() ?? '';
  const snippet = text.length > SNIPPET_MAX ? `${text.slice(0, SNIPPET_MAX - 1)}…` : text;
  return snippet ? `“${snippet}”` : last?.tag || 'element';
}

function usageFileOf(selection: SelectionContext[]): string | null {
  return selection.length === 1 ? (selection[0]?.source?.file ?? null) : null;
}

function usedAtFileOf(selection: SelectionContext[]): string | null {
  return selection.length === 1 ? (selection[0]?.usedAt?.file ?? null) : null;
}

function restoreFocus(previous: Element | null, stage: HTMLElement | null): void {
  const target = previous instanceof HTMLElement && previous.isConnected && previous !== document.body ? previous : stage;
  target?.focus({ preventScroll: true });
}

export function useInlinePrompt(o: InlinePromptOptions): InlinePromptView | null {
  const [open, setOpen] = useState(false);
  const returnTo = useRef<Element | null>(null);
  const latest = useRef(o);
  latest.current = o;

  const show = useCallback(() => {
    const cur = latest.current;
    if (cur.selection.length === 0 || !cur.live) return;
    returnTo.current = document.activeElement;
    setOpen(true);
    window.dispatchEvent(new Event(INLINE_PROMPT_OPEN_EVENT));
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    restoreFocus(returnTo.current, latest.current.stage());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) return;
      if (!matchesKey('inline-prompt', event, IS_MAC) || latest.current.selection.length === 0) return;
      event.preventDefault();
      show();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  const empty = o.selection.length === 0 || !o.live;
  useEffect(() => {
    if (empty) setOpen(false);
  }, [empty]);

  useCommands(() => [
    {
      id: INLINE_PROMPT_COMMAND,
      title: 'Ask the agent at the selection',
      group: 'Run',
      icon: 'chat',
      keyId: 'inline-prompt',
      keywords: 'inline prompt quick edit selection element',
      run: show,
      ...(latest.current.selection.length === 0 ? { disabled: 'Select an element first' } : {}),
    },
  ]);

  const rect = unionRect(o.selection);
  if (!open || !rect || !o.live) return null;
  return {
    rect,
    label: labelOf(o.selection),
    blocked: blockerOf(o),
    usageFile: usageFileOf(o.selection),
    usedAtFile: usedAtFileOf(o.selection),
    route: o.route ?? null,
    submit: (prompt, editScope) => {
      const cur = latest.current;
      if (blockerOf(cur) || !prompt.trim()) return;
      cur.onSubmit?.(prompt.trim(), editScope ? { lean: true, editScope } : { lean: true });
      close();
    },
    close,
  };
}
