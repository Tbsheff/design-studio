import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";

import type { LayerEditsOptions, NodeTask } from "./layer-edits-types.js";

const NODE_WAIT_MS = 2000;

interface NodeTaskInput {
  readonly getOptions: () => LayerEditsOptions;
  readonly isTreeFresh: () => boolean;
  readonly selectedNode: number | null;
  readonly selection: SelectionContext[];
}

const useNodeTask = (
  input: NodeTaskInput
): ((id: number, run: (target: SelectionContext) => void) => void) => {
  const { getOptions, isTreeFresh, selectedNode, selection } = input;
  const taskRef = useRef<NodeTask | null>(null);

  const forNode = useCallback(
    (id: number, run: (target: SelectionContext) => void): void => {
      const current = getOptions();
      const last = current.selection.at(-1);

      if (!isTreeFresh()) {
        current.frames.post({ type: "request-tree" });

        return;
      }

      if (
        current.frames.selectedNode === id &&
        last &&
        current.selection.length === 1
      ) {
        run(last);

        return;
      }

      taskRef.current = { id, run, until: Date.now() + NODE_WAIT_MS };
      current.frames.selectNode(id, false);
    },
    [getOptions, isTreeFresh]
  );

  useEffect(() => {
    const task = taskRef.current;
    const last = selection.at(-1);

    if (!task || selectedNode !== task.id || !last) {
      return;
    }

    taskRef.current = null;

    if (Date.now() <= task.until) {
      task.run(last);
    }
  }, [selection, selectedNode]);

  return forNode;
};

export { useNodeTask };
