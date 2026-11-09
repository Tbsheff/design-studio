import { useCallback, useState } from "react";

import { useCommands } from "../features/commands";
import type { Command } from "../features/commands";
import type { HomeCommand, HomeCommandSource } from "../features/home/index.js";

type SetSource = (source: HomeCommandSource | null) => void;

const toCommand = (command: HomeCommand): Command => {
  const shown: Command = {
    group: command.group,
    icon: command.icon,
    id: command.id,
    keywords: command.keywords,
    run: command.run,
    title: command.title,
  };

  if (command.keyId === null) {
    return shown;
  }

  return { ...shown, keyId: command.keyId };
};

const toCommands = (source: HomeCommandSource | null): Command[] =>
  (source?.() ?? []).map((command) => toCommand(command));

const useHomeCommands = (): SetSource => {
  const [source, setSource] = useState<HomeCommandSource | null>(null);

  const read = useCallback((): Command[] => toCommands(source), [source]);

  useCommands(read);

  return useCallback((next: HomeCommandSource | null): void => {
    setSource(() => next);
  }, []);
};

export { useHomeCommands };
