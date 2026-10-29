import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawStroke } from '../shared/contracts';
import { DRAW_POINTS_MAX, DRAW_STROKES_MAX } from '../shared/comments';
import { useDesktopCommand } from './desktop';
import { DRAW_COLORS } from './drawing';
import { isTypingTarget } from './typingTarget';

export interface DrawTool {
  available: boolean;
  on: boolean;
  toolbarMode: boolean | undefined;
  setOn: (on: boolean) => void;
  toggle: () => void;
  color: string;
  setColor: (color: string) => void;
  strokes: DrawStroke[];
  pointsLeft: number;
  push: (stroke: DrawStroke) => void;
  undo: () => void;
  clear: () => void;
}

function hasText(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target.value !== '' : isTypingTarget(target);
}

export function useDrawTool(available: boolean, onActivate: () => void): DrawTool {
  const [on, setOnState] = useState(false);
  const [color, setColor] = useState<string>(DRAW_COLORS[0].value);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const live = useRef({ on, available, onActivate });
  live.current = { on, available, onActivate };

  const setOn = useCallback((next: boolean) => {
    if (next && !live.current.available) return;
    if (next) live.current.onActivate();
    else setStrokes([]);
    setOnState(next);
  }, []);

  const toggle = useCallback(() => setOn(!live.current.on), [setOn]);
  const undo = useCallback(() => setStrokes((prev) => prev.slice(0, -1)), []);
  const clear = useCallback(() => setStrokes([]), []);
  const push = useCallback((stroke: DrawStroke) => setStrokes((prev) => (prev.length >= DRAW_STROKES_MAX ? prev : [...prev, stroke])), []);

  useEffect(() => {
    if (!available) setOn(false);
  }, [available, setOn]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (live.current.on && mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
        if (hasText(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        undo();
        return;
      }
      if (isTypingTarget(event.target) || mod || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'p' && !event.shiftKey && live.current.available) {
        event.preventDefault();
        toggle();
      } else if (key === 'escape' || key === 'v' || key === 'c') {
        if (live.current.on) setOn(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [setOn, toggle, undo]);

  useDesktopCommand((command) => {
    if (!live.current.on || command.type !== 'undo') return false;
    undo();
    return true;
  });

  const used = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  return { available, on, toolbarMode: available ? on : undefined, setOn, toggle, color, setColor, strokes, pointsLeft: Math.max(0, DRAW_POINTS_MAX - used), push, undo, clear };
}

export function useCanvasDraw(comment: { available: boolean; on: boolean; setOn: (on: boolean) => void }, selectMode: boolean, setSelectMode: (on: boolean) => void): DrawTool {
  const setComment = comment.setOn;
  const draw = useDrawTool(comment.available, () => {
    setSelectMode(false);
    setComment(false);
  });
  const setDraw = draw.setOn;
  useEffect(() => {
    if (comment.on || selectMode) setDraw(false);
  }, [comment.on, selectMode, setDraw]);
  return draw;
}
