import { useEffect, useRef } from 'react';
import { noteHandledShortcut, recentDesktopCommand, useDesktopCommand } from './desktop';
import { isTypingTarget } from './usePanZoom';

export const PREVIEW_HISTORY_EVENT = 'studio:preview-history';

export type HistoryKind = 'undo' | 'redo';

export interface RedoShortcut {
  enabled: boolean;
  onRedo: () => void;
}

export function undoAllowed(directionId: string | null, locked: boolean, versionCount: number): boolean {
  return directionId !== null && !locked && versionCount >= 2;
}

export function historyKeyOf(event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'key'>): HistoryKind | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') return null;
  return event.shiftKey ? 'redo' : 'undo';
}

function modalOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export interface ShortcutState {
  enabled: boolean;
  onUndo: () => void;
  redo: RedoShortcut | undefined;
}

export function routeHistoryCommand(kind: HistoryKind, state: ShortcutState, modal: () => boolean = modalOpen): boolean {
  if (kind === 'redo' && !state.redo) return false;
  if (modal()) return true;
  if (kind === 'undo' && state.enabled) state.onUndo();
  if (kind === 'redo' && state.redo?.enabled) state.redo.onRedo();
  return true;
}

export function useUndoShortcut(enabled: boolean, onUndo: () => void, redo?: RedoShortcut): void {
  const state = useRef<ShortcutState>({ enabled, onUndo, redo });
  state.current = { enabled, onUndo, redo };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const kind = historyKeyOf(event);
      if (!kind || isTypingTarget(event.target)) return;
      if (kind === 'redo' && !state.current.redo) return;
      event.preventDefault();
      routeHistoryCommand(kind, state.current);
    };
    const fromPreview = (event: Event) => {
      const kind: HistoryKind = (event as CustomEvent<{ redo?: unknown }>).detail?.redo === true ? 'redo' : 'undo';
      if (recentDesktopCommand(kind)) return;
      noteHandledShortcut(kind);
      routeHistoryCommand(kind, state.current);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(PREVIEW_HISTORY_EVENT, fromPreview);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PREVIEW_HISTORY_EVENT, fromPreview);
    };
  }, []);
  useDesktopCommand((command) => {
    if ((command.type !== 'undo' && command.type !== 'redo') || isTypingTarget(document.activeElement)) return false;
    return routeHistoryCommand(command.type, state.current);
  });
}
