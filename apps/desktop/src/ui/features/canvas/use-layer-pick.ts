import type { LayerPick } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { LAYER_PICK_WAIT_MS } from "./layer-pick-model.js";
import type { MenuLocal } from "./layer-pick-model.js";

interface LayerPickHandle {
  readonly layers: LayerPick[];
  readonly onHover: (layer: LayerPick | null) => void;
  readonly onPick: (layer: LayerPick) => void;
}

interface Reply {
  readonly layers: LayerPick[];
  readonly local: MenuLocal;
}

const NO_LAYERS: LayerPick[] = [];

const useLayerPick = (
  port: PreviewPort | null,
  local: MenuLocal | null
): LayerPickHandle => {
  const [reply, setReply] = useState<Reply | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (!port?.listen || !local) {
      return;
    }

    nextId.current += 1;
    const requestId = `layers-at-${nextId.current}`;

    const stop = port.listen((message): void => {
      if (message.type === "layers-at" && message.requestId === requestId) {
        setReply({ layers: message.layers, local });
        stop();
      }
    });

    const timer = globalThis.setTimeout(stop, LAYER_PICK_WAIT_MS);
    port.post({ requestId, type: "layers-at-point", x: local.x, y: local.y });

    return (): void => {
      globalThis.clearTimeout(timer);
      stop();
    };
  }, [port, local]);

  const onHover = useCallback(
    (layer: LayerPick | null): void => {
      let id: number | null = null;

      if (layer) {
        ({ id } = layer);
      }

      port?.post({ id, type: "hover-node" });
    },
    [port]
  );

  const onPick = useCallback(
    (layer: LayerPick): void => {
      onHover(null);
      port?.post({ selector: layer.selector, type: "select-selector" });
    },
    [onHover, port]
  );

  let layers = NO_LAYERS;

  if (reply && reply.local === local) {
    ({ layers } = reply);
  }

  return { layers, onHover, onPick };
};

export { useLayerPick };

export type { LayerPickHandle };
