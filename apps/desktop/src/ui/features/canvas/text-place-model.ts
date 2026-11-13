import type {
  BridgeToParent,
  SelectionContext,
  SourceLoc,
} from "@design-studio/contracts";

import type { VectorRequest } from "../../../shared/vector.js";
import type { Point, VectorLayerProps } from "./vector-layer-types.js";
import type { Place } from "./vector-place-model.js";

const SELECT_STEP_MS = 400;

const SELECT_GIVE_UP_MS = 4500;

type Placed = SourceLoc & { readonly tag: string };

const toTextRequest = (
  at: Point,
  place: Place,
  page: string | null
): VectorRequest => {
  const request: VectorRequest = {
    box: {
      height: 0,
      width: 0,
      x: at.x - place.origin.x,
      y: at.y - place.origin.y,
    },
    op: "text",
    relativeParent: place.relativeParent,
    target: place.target,
  };

  if (page) {
    return { ...request, page };
  }

  return request;
};

const isSameFile = (file: string, placed: Placed): boolean =>
  file === placed.file || file.endsWith(`/${placed.file}`);

const isPlacedSelection = (
  selection: SelectionContext,
  placed: Placed
): boolean => {
  const { source } = selection;

  if (source === null || !isSameFile(source.file, placed)) {
    return false;
  }

  return source.line === placed.line && source.col === placed.col;
};

const toSelectedPlaced = (
  message: BridgeToParent,
  placed: Placed
): string | null => {
  if (
    message.type !== "select" ||
    !isPlacedSelection(message.selection, placed)
  ) {
    return null;
  }

  return message.selection.selector;
};

const startPlacedTextEdit = (
  bridge: Pick<VectorLayerProps, "listen" | "post">,
  placed: Placed
): void => {
  const timers: ReturnType<typeof globalThis.setTimeout>[] = [];

  const stopAll = (): void => {
    for (const timer of timers) {
      globalThis.clearTimeout(timer);
    }
  };

  const unlisten = bridge.listen((message) => {
    const selector = toSelectedPlaced(message, placed);

    if (selector === null) {
      return;
    }

    stopAll();
    unlisten();
    bridge.post({ selector, type: "text-edit-start" });
  });

  for (
    let wait = SELECT_STEP_MS;
    wait < SELECT_GIVE_UP_MS;
    wait += SELECT_STEP_MS
  ) {
    timers.push(
      globalThis.setTimeout(() => {
        bridge.post({
          sourceLoc: `${placed.file}:${placed.line}:${placed.col}`,
          tag: placed.tag,
          text: "",
          type: "select-source",
        });
      }, wait)
    );
  }

  timers.push(
    globalThis.setTimeout(() => {
      stopAll();
      unlisten();
    }, SELECT_GIVE_UP_MS)
  );
};

export { startPlacedTextEdit, toTextRequest };

export type { Placed };
