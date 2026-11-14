import { loadCanvasCommands } from "../features/commands/index.js";
import type { CanvasCommandsInput } from "../features/commands/index.js";

const useCanvasCommands = await loadCanvasCommands();

const useCanvasCommandsHost = (input: CanvasCommandsInput): null => {
  useCanvasCommands(input);

  return null;
};

export { useCanvasCommandsHost };
