import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextEditMessage } from './usePreviewFrames';

export const MAX_INLINE_TEXT = 5000;

export type TextCommitHandler = (selector: string, text: string) => void;

export function parseTextCommit(message: TextEditMessage): { selector: string; text: string } | null {
  if (message.type !== 'text-commit') return null;
  const { selector, text } = message as { selector: unknown; text: unknown };
  if (typeof selector !== 'string' || selector === '' || selector.length > 2000) return null;
  if (typeof text !== 'string' || text.length > MAX_INLINE_TEXT) return null;
  return { selector, text };
}

export function useInlineTextEdit(allowed: boolean, onCommit: TextCommitHandler | undefined, onReject: () => void) {
  const [editing, setEditing] = useState(false);
  const live = useRef({ onCommit, onReject });
  live.current = { onCommit, onReject };

  useEffect(() => {
    if (!allowed) setEditing(false);
  }, [allowed]);


  const onMessage = useCallback((message: TextEditMessage) => {
    if (message.type === 'text-edit') {
      setEditing(message.state === 'start');
      return;
    }
    setEditing(false);
    const parsed = parseTextCommit(message);
    if (parsed && live.current.onCommit) live.current.onCommit(parsed.selector, parsed.text);
    else live.current.onReject();
  }, []);

  const reset = useCallback(() => setEditing(false), []);

  return { editing, onMessage, reset };
}
