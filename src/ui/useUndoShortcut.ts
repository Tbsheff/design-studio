import { useEffect, useRef } from 'react';
import { useDesktopCommand } from './desktop';
import { isTypingTarget } from './usePanZoom';

export function undoAllowed(directionId: string | null, locked: boolean, versionCount: number): boolean {
  return directionId !== null && !locked && versionCount >= 2;
}

function isUndoKey(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'z';
}

export function useUndoShortcut(enabled: boolean, onUndo: () => void): void {
  const state = useRef({ enabled, onUndo });
  state.current = { enabled, onUndo };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isUndoKey(event) || isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      if (state.current.enabled) state.current.onUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useDesktopCommand((command) => {
    if (command.type !== 'undo' || isTypingTarget(document.activeElement)) return false;
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return true;
    if (state.current.enabled) state.current.onUndo();
    return true;
  });
}
