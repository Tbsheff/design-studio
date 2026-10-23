import { useEffect, useRef } from 'react';
import type { DesktopCommand, DesktopContext } from '../shared/desktop-link';

interface DesktopBridge {
  platform: string;
  version: string;
  onCommand?: (handler: (command: DesktopCommand) => void) => void;
  setContext?: (context: DesktopContext) => void;
}

type Handler = (command: DesktopCommand) => boolean;

const handlers: Handler[] = [];
const KEY_ECHO_MS = 400;
const recentKeys = new Map<string, { at: number; event: KeyboardEvent }>();
let installed = false;

function bridge(): DesktopBridge | undefined {
  return (window as unknown as { studioDesktop?: DesktopBridge }).studioDesktop;
}

function isDesktop(): boolean {
  return bridge() !== undefined;
}

function shortcutName(event: KeyboardEvent): string | null {
  if (!(event.metaKey || event.ctrlKey)) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'enter') return 'run';
  if (key === '.') return 'stop';
  return null;
}

function dispatchDesktopCommand(command: DesktopCommand): void {
  const pressed = recentKeys.get(command.type);
  if (pressed && pressed.event.defaultPrevented && Date.now() - pressed.at < KEY_ECHO_MS) return;
  for (const handler of [...handlers].reverse()) if (handler(command)) return;
}

function install(): void {
  if (installed) return;
  installed = true;
  window.addEventListener(
    'keydown',
    (event) => {
      const name = shortcutName(event);
      if (name) recentKeys.set(name, { at: Date.now(), event });
    },
    true,
  );
  bridge()?.onCommand?.(dispatchDesktopCommand);
}

export function useDesktopCommand(handler: Handler): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!isDesktop()) return undefined;
    install();
    const entry: Handler = (command) => latest.current(command);
    handlers.push(entry);
    return () => {
      const index = handlers.indexOf(entry);
      if (index >= 0) handlers.splice(index, 1);
    };
  }, []);
}

export function useDesktopContext(context: DesktopContext, enabled = true): void {
  const { projectId, directionId, running } = context;
  useEffect(() => {
    if (enabled) bridge()?.setContext?.({ projectId, directionId, running });
  }, [projectId, directionId, running, enabled]);
}
