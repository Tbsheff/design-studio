import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { CommandLayerName } from "../features/commands";
import { isTypingTarget } from "../platform/typing-target.js";
import { prefetchCommandLayer } from "./screens";

const LAYER_EVENT = "studio:command-layer";

const toLayer = (value: string | null): CommandLayerName | null => {
  if (value === "palette" || value === "shortcuts") {
    return value;
  }

  return null;
};

const toggleLayer = (
  current: CommandLayerName | null,
  next: CommandLayerName
): CommandLayerName | null => {
  if (current === next) {
    return null;
  }

  return next;
};

const hasPaletteModifier = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;

const isPaletteKey = (event: KeyboardEvent): boolean =>
  hasPaletteModifier(event) && (event.code === "KeyK" || event.code === "KeyP");

const isShortcutsKey = (event: KeyboardEvent): boolean => {
  if (event.key !== "?" || event.metaKey || event.altKey) {
    return false;
  }

  return event.ctrlKey || !isTypingTarget(event.target);
};

const layerForKey = (event: KeyboardEvent): CommandLayerName | null => {
  if (isPaletteKey(event)) {
    return "palette";
  }

  if (isShortcutsKey(event)) {
    return "shortcuts";
  }

  return null;
};

const useCommandLayer = (): [
  CommandLayerName | null,
  Dispatch<SetStateAction<CommandLayerName | null>>,
] => {
  const [layer, setLayer] = useState<CommandLayerName | null>(null);

  useEffect(() => {
    const toggle = (next: CommandLayerName | null): void => {
      if (next !== null) {
        setLayer((current) => toggleLayer(current, next));
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Meta" || event.key === "Control") {
        void prefetchCommandLayer();
      }

      const next = layerForKey(event);

      if (next === null || event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      toggle(next);
    };

    const onOpen = (event: Event): void => {
      if (event instanceof CustomEvent) {
        const detail: string | null = event.detail;
        toggle(toLayer(detail));
      }
    };

    globalThis.addEventListener("keydown", onKey, true);
    globalThis.addEventListener(LAYER_EVENT, onOpen);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
      globalThis.removeEventListener(LAYER_EVENT, onOpen);
    };
  }, []);

  return [layer, setLayer];
};

export { useCommandLayer };
