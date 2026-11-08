import type { DrawTool } from "./use-draw-tool.js";
import {
  useVectorTool,
  useVectorToolGuards,
  useVectorToolKeys,
} from "./vector-tool-model.js";

const useCanvasVectorTools = (
  editsEnabled: boolean,
  protoOn: boolean,
  draw: DrawTool,
  comment: { on: boolean; setOn: (on: boolean) => void }
): void => {
  const { tool } = useVectorTool();
  useVectorToolKeys(editsEnabled && !protoOn);
  useVectorToolGuards(tool, draw.on || comment.on, () => {
    draw.setOn(false);
    comment.setOn(false);
  });
};

export { useCanvasVectorTools };
