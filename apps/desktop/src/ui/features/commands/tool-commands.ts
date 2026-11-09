import { requestCanvasTool, requestPresent, requestReload } from "./deps.js";
import type { CanvasToolId, KeyId } from "./deps.js";
import type { Command } from "./registry.js";

interface ToolSpec {
  readonly icon: Command["icon"];
  readonly keyId: KeyId;
  readonly keywords: string;
  readonly title: string;
  readonly tool: CanvasToolId;
}

const TOOLS: readonly ToolSpec[] = [
  {
    icon: "hand",
    keyId: "tool-hand",
    keywords: "pan move drag scroll",
    title: "Hand tool",
    tool: "hand",
  },
  {
    icon: "frame",
    keyId: "tool-frame",
    keywords: "box container div auto layout insert",
    title: "Frame tool",
    tool: "frame",
  },
  {
    icon: "square",
    keyId: "tool-rect",
    keywords: "shape rectangle vector draw",
    title: "Shape tool",
    tool: "shape",
  },
  {
    icon: "penTool",
    keyId: "tool-pen",
    keywords: "vector path bezier",
    title: "Pen tool",
    tool: "pen",
  },
  {
    icon: "type",
    keyId: "tool-text",
    keywords: "type copy paragraph heading insert",
    title: "Text tool",
    tool: "text",
  },
  {
    icon: "protoLink",
    keyId: "tool-link",
    keywords: "prototype link connect flow frame",
    title: "Prototype link tool",
    tool: "prototype",
  },
];

const toolCommands = (): Command[] => [
  ...TOOLS.map((spec) => ({
    group: "Canvas",
    icon: spec.icon,
    id: `tool.${spec.tool}`,
    keyId: spec.keyId,
    keywords: spec.keywords,
    run: () => requestCanvasTool(spec.tool),
    title: spec.title,
  })),
  {
    group: "Canvas",
    icon: "play",
    id: "present.window",
    keyId: "present",
    keywords: "present preview full screen show",
    run: requestPresent,
    title: "Present",
  },
  {
    group: "Canvas",
    icon: "reload",
    id: "view.reload",
    keywords: "refresh preview frames",
    run: requestReload,
    title: "Reload the preview",
  },
];

export { toolCommands };
