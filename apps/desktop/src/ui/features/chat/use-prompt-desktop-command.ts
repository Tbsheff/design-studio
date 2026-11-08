import { useDesktopCommand } from "../../platform/desktop.js";
import { focusPromptTextarea } from "./composer-focus.js";

interface PromptDesktopOptions {
  readonly canSend: boolean;
  readonly isRunning: boolean;
  readonly onCancel: () => void;
  readonly send: () => void;
}

const usePromptDesktopCommand = (options: PromptDesktopOptions): void => {
  useDesktopCommand((command) => {
    if (command.type === "run") {
      if (options.canSend) {
        options.send();
      } else {
        focusPromptTextarea();
      }

      return true;
    }

    if (command.type === "stop") {
      if (options.isRunning) {
        options.onCancel();
      }

      return true;
    }

    return false;
  });
};

export { usePromptDesktopCommand };
