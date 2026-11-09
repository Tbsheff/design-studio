import type { AppKey, BridgeToParent } from "@design-studio/contracts";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";

import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import {
  PREVIEW_ESCAPE_EVENT,
  PREVIEW_STOP_EVENT,
} from "../chat/use-escape-stop.js";
import { moveRegion, openLayer, runCommand } from "../commands/index.js";
import { toTextEditability } from "../inspector/index.js";
import { PREVIEW_PAINTED_EVENT } from "../inspector/use-edit-history.js";
import { parseLayerTree } from "../versions-layers-tokens/layers-tree.js";
import type { LayerTree } from "../versions-layers-tokens/layers-tree.js";
import { runPreviewToolKey, toPreviewCommandId } from "./preview-app-keys.js";
import { toPreviewApi } from "./preview-frames-api.js";
import type { PreviewApi } from "./preview-frames-api.js";
import { frameFor } from "./preview-frames-core.js";
import { onBridgeMessage } from "./preview-frames-messages.js";
import { createPreviewState, mirrorPreview } from "./preview-frames-state.js";
import type {
  PreviewHost,
  PreviewOptions,
  PreviewState,
  TextEditMessage,
} from "./preview-frames-types.js";
import {
  PREVIEW_ARRANGE_KEY_EVENT,
  PREVIEW_LAYOUT_KEY_EVENT,
} from "./preview-key-forward.js";
import type { HoverBox } from "./preview-rect-model.js";
import type { PreviewSlot } from "./preview-slot-model.js";
import { usePreviewEffects } from "./use-preview-effects.js";

interface PreviewFrames extends PreviewApi {
  elements: PreviewState["elements"];
  frontToken: string | null;
  hover: PreviewState["hover"];
  picked: PreviewState["picked"];
  selectedNode: number | null;
  slots: PreviewSlot[];
  tree: LayerTree | null;
}

const toRegionStep = (id: AppKey): 1 | -1 => {
  if (id === "next-region") {
    return 1;
  }

  return -1;
};

const forwardAppKeyToShell = (id: AppKey): void => {
  if (runPreviewToolKey(id)) {
    return;
  }

  const command = toPreviewCommandId(id);

  if (command) {
    void runCommand(command);

    return;
  }

  if (id === "ask-inline") {
    void runCommand("selection.ask-inline");

    return;
  }

  if (id === "project-rail") {
    void runCommand("view.project-rail");

    return;
  }

  if (id === "stop") {
    globalThis.dispatchEvent(new CustomEvent(PREVIEW_STOP_EVENT));

    return;
  }

  if (id === "palette" || id === "shortcuts") {
    openLayer(id);

    return;
  }

  void moveRegion(toRegionStep(id));
};

const usePreviewFrames = (options: PreviewOptions): PreviewFrames => {
  const [slots, setSlots] = useState<PreviewSlot[]>([]);
  const [frontToken, setFrontToken] = useState<string | null>(null);
  const [tree, setTree] = useState<LayerTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  const host = useMemo<PreviewHost>(
    () => ({
      canEditText: (target): boolean => toTextEditability(target) === "ok",
      escapeEvent: PREVIEW_ESCAPE_EVENT,
      forwardAppKey: forwardAppKeyToShell,
      onTree: (message): void => setTree(parseLayerTree(message)),
      paintedEvent: PREVIEW_PAINTED_EVENT,
    }),
    []
  );

  const state = useMemo(
    () =>
      createPreviewState(host, {
        front: setFrontToken,
        selectedNode: setSelectedNode,
        slots: setSlots,
      }),
    [host]
  );

  const api = useMemo(() => toPreviewApi(state), [state]);

  useLayoutEffect(() => {
    mirrorPreview(state, options, slots, frontToken);
  });

  usePreviewEffects(state, options, frontToken);

  const getFrames = useCallback(
    (): BridgeFrame[] => state.slots.map((slot) => frameFor(state, slot)),
    [state]
  );

  const onMessage = useCallback(
    (frame: BridgeFrame, message: BridgeToParent): void =>
      onBridgeMessage(state, frame, message),
    [state]
  );

  useBridge(getFrames, onMessage);

  const { elements, hover, picked } = state;

  return {
    ...api,
    elements,
    frontToken,
    hover,
    picked,
    selectedNode,
    slots,
    tree,
  };
};

export {
  PREVIEW_ARRANGE_KEY_EVENT,
  PREVIEW_LAYOUT_KEY_EVENT,
  usePreviewFrames,
};

export type { HoverBox, TextEditMessage };
