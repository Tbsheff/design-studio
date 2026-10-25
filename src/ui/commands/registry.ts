import { useEffect, useRef } from 'react';
import type { KeyId } from '../../shared/keymap';
import type { IconName } from '../components/Icon';

export const COMMAND_EVENT = 'studio:command';
export const LAYER_EVENT = 'studio:command-layer';

export type CommandLayer = 'palette' | 'shortcuts';

export interface Command {
  id: string;
  title: string;
  group: string;
  run: () => void;
  keyId?: KeyId;
  keywords?: string;
  icon?: IconName;
  disabled?: string;
  slash?: string;
}

type Source = () => Command[];

const sources = new Set<{ current: Source }>();

export function collectCommands(): Command[] {
  const seen = new Set<string>();
  const out: Command[] = [];
  for (const source of [...sources].reverse()) {
    for (const command of source.current()) {
      if (seen.has(command.id)) continue;
      seen.add(command.id);
      out.push(command);
    }
  }
  return out;
}

export function runCommand(id: string): boolean {
  const command = collectCommands().find((c) => c.id === id);
  if (!command || command.disabled) return false;
  command.run();
  return true;
}

export function openLayer(layer: CommandLayer): void {
  window.dispatchEvent(new CustomEvent(LAYER_EVENT, { detail: layer }));
}

export function useCommands(source: Source): void {
  const ref = useRef(source);
  ref.current = source;
  useEffect(() => {
    const entry = { current: () => ref.current() };
    sources.add(entry);
    return () => {
      sources.delete(entry);
    };
  }, []);
}

let listening = false;

export function listenForCommands(): void {
  if (listening) return;
  listening = true;
  window.addEventListener(COMMAND_EVENT, (event) => {
    const id = (event as CustomEvent<unknown>).detail;
    if (typeof id === 'string') runCommand(id);
  });
}
