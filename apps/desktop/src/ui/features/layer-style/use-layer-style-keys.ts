import { useEffect, useRef } from "react";

import { copy } from "./copy.js";
import {
  LAYER_STYLE_KEY_EVENT,
  isMacPlatform,
  isTypingTarget,
  matchesKey,
} from "./deps.js";
import type { LayerStyleKeyDetail, SelectionContext } from "./deps.js";
import type { LayerStyleHost } from "./use-layer-style-host.js";

interface LayerStyleKeysOptions {
  readonly host: LayerStyleHost;
  readonly notify: (message: string) => void;
  readonly selection: SelectionContext[];
}

const IS_MAC = isMacPlatform();

const STYLE_KEYS = [
  { appKey: "style-copy", itemId: "copy-style", keyId: "copy-style" },
  { appKey: "style-paste", itemId: "paste-style", keyId: "paste-style" },
] as const;

type StyleKey = (typeof STYLE_KEYS)[number];

const runStyleKey = (options: LayerStyleKeysOptions, key: StyleKey): void => {
  const target = options.selection.at(-1);

  if (!target || options.host.opened) {
    return;
  }

  if (options.host.isPending) {
    options.notify(copy.wait);

    return;
  }

  const item = options.host
    .items(target)
    .find((entry) => entry.id === key.itemId);

  if (!item) {
    return;
  }

  if (item.disabled) {
    options.notify(item.disabled);

    return;
  }

  item.run();
};

const toPressedKey = (event: KeyboardEvent): StyleKey | null => {
  if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) {
    return null;
  }

  return STYLE_KEYS.find((key) => matchesKey(key.keyId, event, IS_MAC)) ?? null;
};

const toForwardedKey = (event: Event): StyleKey | null => {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail = event.detail as LayerStyleKeyDetail | null;

  return STYLE_KEYS.find((key) => key.appKey === detail?.id) ?? null;
};

const useLayerStyleKeys = (options: LayerStyleKeysOptions): void => {
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  }, [options]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const key = toPressedKey(event);

      if (key) {
        event.preventDefault();
        runStyleKey(latest.current, key);
      }
    };

    const onForwarded = (event: Event): void => {
      const key = toForwardedKey(event);

      if (key) {
        runStyleKey(latest.current, key);
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(LAYER_STYLE_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(LAYER_STYLE_KEY_EVENT, onForwarded);
    };
  }, []);
};

export { useLayerStyleKeys };

export type { LayerStyleKeysOptions };
