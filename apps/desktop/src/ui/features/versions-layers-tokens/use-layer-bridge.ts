import type {
  BridgeToParent,
  ReorderMove,
  SelectionContext,
  StructureKey,
} from "@design-studio/contracts";
import { useCallback } from "react";
import type { RefObject } from "react";

import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { handleLayerBridge } from "./layer-bridge-model.js";
import type { LayerEditsOptions } from "./layer-edits-types.js";
import { useLayerShortcuts } from "./use-layer-shortcuts.js";

interface LayerBridgeInput {
  readonly isMac: boolean;
  readonly liveRef: RefObject<LayerEditsOptions>;
  readonly moveSelected: (move: ReorderMove) => void;
  readonly onBridge: (message: BridgeToParent) => void;
  readonly resolveReselect: (
    token: string,
    selection: SelectionContext
  ) => void;
  readonly sendReselect: () => void;
  readonly setTreeToken: (token: string) => void;
  readonly structureKey: (key: StructureKey) => void;
}

const useLayerBridge = (input: LayerBridgeInput): void => {
  const {
    isMac,
    liveRef,
    moveSelected,
    onBridge,
    resolveReselect,
    sendReselect,
    setTreeToken,
    structureKey,
  } = input;

  const getOptions = useCallback(() => liveRef.current, [liveRef]);

  const toFrames = (): BridgeFrame[] =>
    liveRef.current.frames.slots.map((slot): BridgeFrame => ({
      element: liveRef.current.frames.elements.current[slot.token] ?? null,
      key: slot.token,
      kind: liveRef.current.kind,
      token: slot.token,
      url: slot.src,
    }));

  useBridge(toFrames, (frame, message: BridgeToParent) => {
    handleLayerBridge(
      {
        getOptions,
        moveSelected,
        onBridge,
        resolveReselect,
        sendReselect,
        setTreeToken,
        structureKey,
      },
      frame,
      message
    );
  });

  useLayerShortcuts({
    getOptions,
    isMac,
    onMove: moveSelected,
    onStructureKey: structureKey,
  });
};

export { useLayerBridge };
