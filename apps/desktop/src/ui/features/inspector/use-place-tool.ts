import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useEffectEvent, useRef } from "react";
import type { MutableRefObject } from "react";

import { heldTool } from "../../platform/canvas-tool.js";
import type { HeldTool } from "../../platform/canvas-tool.js";
import { useLive } from "../../platform/live-store.js";
import type { DirectEditControl } from "./use-direct-edit.js";
import { useInsertTool } from "./use-insert-tool.js";

interface PlaceOptions {
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly directionId: string | null;
  readonly projectId: string;
  readonly selection: SelectionContext[];
}

const isPlaceTool = (tool: HeldTool | null): tool is "frame" | "text" =>
  tool === "frame" || tool === "text";

const usePlaceTool = (options: PlaceOptions): void => {
  const held = useLive(heldTool);
  const lastPicked = options.selection.at(-1) ?? null;
  const selector = lastPicked?.selector ?? null;
  const seen = useRef(selector);

  const { handleInsert } = useInsertTool({
    control: options.control,
    directionId: options.directionId,
    last: lastPicked,
    projectId: options.projectId,
  });

  const place = useEffectEvent((kind: "frame" | "text"): void => {
    handleInsert(kind);
    heldTool.set(null);
  });

  useEffect(() => {
    const before = seen.current;
    seen.current = selector;

    if (selector === null || selector === before || !isPlaceTool(held)) {
      return;
    }

    place(held);
  }, [held, selector]);
};

export { usePlaceTool };
