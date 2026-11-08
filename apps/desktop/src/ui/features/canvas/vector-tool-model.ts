import { useEffect, useRef, useSyncExternalStore } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import type { KeyId } from "../../../shared/keymap.js";
import { vectorToolKeyOf } from "../../../shared/vector.js";
import type {
  VectorRequest,
  VectorResult,
  VectorToolId,
} from "../../../shared/vector.js";
import { json } from "../../api.js";
import { IS_MAC } from "../../canvas-hook-slots.js";
import { isTypingTarget } from "../../platform/typing-target.js";

const PREVIEW_TOOL_KEY_EVENT = "studio:preview-tool-key";

interface State {
  tool: VectorToolId | null;
  available: boolean;
}

let state: State = { available: false, tool: null };
const listeners = new Set<() => void>();

function emit(next: Partial<State>): void {
  state = { ...state, ...next };

  if (!state.available) {
    state = { ...state, tool: null };
  }

  for (const listener of listeners) {
    listener();
  }
}

const vectorTool = {
  get: () => state,
  set: (tool: VectorToolId | null) =>
    emit({ tool: state.available ? tool : null }),
  setAvailable: (available: boolean) => {
    if (available !== state.available) {
      emit({ available });
    }
  },
  subscribe(listener: () => void): () => boolean {
    listeners.add(listener);

    return (): boolean => listeners.delete(listener);
  },
  toggle: (tool: VectorToolId) =>
    emit({ tool: state.available && state.tool !== tool ? tool : null }),
};

function useVectorTool(): State {
  return useSyncExternalStore(
    vectorTool.subscribe,
    vectorTool.get,
    vectorTool.get
  );
}

const VECTOR_TOOL_LIST: {
  id: VectorToolId;
  label: string;
  keyId: KeyId;
  glyph: string;
}[] = [
  {
    glyph: "M2.75 3.75h10.5v8.5H2.75z",
    id: "rect",
    keyId: "tool-rect",
    label: "Rectangle",
  },
  {
    glyph: "M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
    id: "ellipse",
    keyId: "tool-ellipse",
    label: "Ellipse",
  },
  {
    glyph:
      "M8 2.5 12.5 9 8 13.5 3.5 9zM8 2.5v5.25M8 9.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z",
    id: "pen",
    keyId: "tool-pen",
    label: "Pen",
  },
];

const VECTOR_TOOLS = VECTOR_TOOL_LIST.map((item) => ({
  ...item,
  keyLabel: shortcutLabel(item.keyId, IS_MAC),
}));

function useVectorToolKeys(available: boolean): void {
  useEffect(() => vectorTool.setAvailable(available), [available]);
  useEffect(() => (): void => vectorTool.setAvailable(false), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        isTypingTarget(event.target) ||
        document.querySelector(".play-bar")
      ) {
        return;
      }

      const tool = vectorToolKeyOf(event);

      if (!tool || !vectorTool.get().available) {
        return;
      }

      event.preventDefault();
      vectorTool.toggle(tool);
    };

    const onForwarded = (event: Event): void => {
      const tool = (event as CustomEvent<{ tool?: VectorToolId }>).detail?.tool;

      if (
        tool &&
        vectorTool.get().available &&
        !document.querySelector(".play-bar")
      ) {
        vectorTool.toggle(tool);
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener(PREVIEW_TOOL_KEY_EVENT, onForwarded);

    return (): void => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PREVIEW_TOOL_KEY_EVENT, onForwarded);
    };
  }, []);
}

function useVectorToolGuards(
  tool: VectorToolId | null,
  otherOn: boolean,
  stopOthers: () => void
): void {
  const stop = useRef(stopOthers);
  stop.current = stopOthers;
  useEffect(() => {
    if (tool) {
      stop.current();
    }
  }, [tool]);
  useEffect(() => {
    if (otherOn) {
      vectorTool.set(null);
    }
  }, [otherOn]);
}

function runVector(
  projectId: string,
  directionId: string,
  request: VectorRequest
): Promise<VectorResult> {
  return json<VectorResult>(
    "POST",
    `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/vector`,
    request
  );
}

export {
  PREVIEW_TOOL_KEY_EVENT,
  VECTOR_TOOLS,
  runVector,
  useVectorTool,
  useVectorToolGuards,
  useVectorToolKeys,
  vectorTool,
};

export type { VectorToolId };
