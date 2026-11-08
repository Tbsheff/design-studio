import { useEffect, useRef } from "react";

import { createLiveStore } from "./deps.js";
import type { IconName, KeyId } from "./deps.js";

export const COMMAND_EVENT = "studio:command";
export const LAYER_EVENT = "studio:command-layer";

export type CommandLayer = "palette" | "shortcuts";

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

const sources = createLiveStore<readonly { current: Source }[]>([]);

export const collectCommands = (): Command[] => {
  const seen = new Set<string>();
  const out: Command[] = [];

  for (const source of [...sources.get()].reverse()) {
    for (const command of source.current()) {
      if (seen.has(command.id)) {
        continue;
      }

      seen.add(command.id);
      out.push(command);
    }
  }

  return out;
};

export const runCommand = (id: string): boolean => {
  const command = collectCommands().find((c) => c.id === id);

  if (!command || command.disabled) {
    return false;
  }

  command.run();

  return true;
};

export const commandBlocker = (id: string): string | null => {
  const command = collectCommands().find((c) => c.id === id);

  return command ? (command.disabled ?? null) : "Not available here";
};

export const openLayer = (layer: CommandLayer): void => {
  window.dispatchEvent(new CustomEvent(LAYER_EVENT, { detail: layer }));
};

export const useCommands = (source: Source): void => {
  const ref = useRef(source);
  ref.current = source;
  useEffect(() => {
    const entry = { current: (): Command[] => ref.current() };
    sources.set([...sources.get(), entry]);

    return (): void => {
      sources.set(sources.get().filter((e) => e !== entry));
    };
  }, []);
};

let listening = false;

export const listenForCommands = (): void => {
  if (listening) {
    return;
  }

  listening = true;
  window.addEventListener(COMMAND_EVENT, (event) => {
    const id = (event as CustomEvent<unknown>).detail;

    if (typeof id === "string") {
      runCommand(id);
    }
  });
};

export { IS_MAC, tipWithKey } from "./keys.js";
