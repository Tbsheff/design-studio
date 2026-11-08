import { copy } from "./copy.js";
import { useCommands } from "./deps.js";

const MARKUP_COMMAND = "markup.start";

const useMarkupCommand = (onStart: () => void): void => {
  useCommands(() => [
    {
      group: "Run",
      icon: "pointer",
      id: MARKUP_COMMAND,
      keywords: copy.commandKeywords,
      run: onStart,
      title: copy.title,
    },
  ]);
};

export { MARKUP_COMMAND, useMarkupCommand };
