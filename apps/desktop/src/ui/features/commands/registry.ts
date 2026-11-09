import { useEffect, useRef } from "react";

import { createLiveStore } from "./deps.js";
import type { IconName, KeyId } from "./deps.js";
import { IS_MAC, tipWithKey } from "./keys.js";

const COMMAND_EVENT = "studio:command";
const LAYER_EVENT = "studio:command-layer";

type CommandLayer = "files" | "palette" | "projects" | "shortcuts";

interface Command {
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

const collectCommands = (): Command[] => {
  const seen = new Set<string>();
  const out: Command[] = [];

  for (const source of sources.get().toReversed()) {
    const fresh = source.current().filter((command) => !seen.has(command.id));

    for (const command of fresh) {
      seen.add(command.id);
      out.push(command);
    }
  }

  return out;
};

const runCommand = (id: string): boolean => {
  const command = collectCommands().find((char) => char.id === id);

  if (!command || command.disabled) {
    return false;
  }

  command.run();

  return true;
};

const commandBlocker = (id: string): string | null => {
  const command = collectCommands().find((ch) => ch.id === id);

  if (command) {
    return command.disabled ?? null;
  }

  return "Not available here";
};

const openLayer = (layer: CommandLayer): void => {
  globalThis.dispatchEvent(new CustomEvent(LAYER_EVENT, { detail: layer }));
};

const useCommands = (source: Source): void => {
  const ref = useRef(source);

  useEffect(() => {
    ref.current = source;
  }, [source]);
  useEffect(() => {
    const entry = { current: (): Command[] => ref.current() };
    sources.set([...sources.get(), entry]);

    return (): void => {
      sources.set(sources.get().filter((evt) => evt !== entry));
    };
  }, []);
};

let listening = false;

const listenForCommands = (): void => {
  if (listening) {
    return;
  }

  listening = true;
  globalThis.addEventListener(COMMAND_EVENT, (event) => {
    if (event instanceof CustomEvent) {
      runCommand(String(event.detail));
    }
  });
};

export {
  COMMAND_EVENT,
  IS_MAC,
  LAYER_EVENT,
  collectCommands,
  commandBlocker,
  listenForCommands,
  openLayer,
  runCommand,
  tipWithKey,
  useCommands,
};

export type { Command, CommandLayer };
