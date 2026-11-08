import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { findElement, isTypingTarget, matchesKey } from "./deps.js";
import type { KeyId } from "./deps.js";
import { IS_MAC } from "./key-model.js";
import { listenForCommands, runCommand, useCommands } from "./registry.js";
import type { Command } from "./registry.js";
import type { StudioActions } from "./studio-actions.js";
import { studioCommands } from "./studio-commands.js";
import { moveRegion } from "./studio-regions.js";

const KEYED: [KeyId, string][] = [
  ["home", "go.home"],
  ["settings", "project.settings"],
  ["next-direction", "direction.next"],
  ["prev-direction", "direction.prev"],
];

const toRegionStep = (event: KeyboardEvent): 1 | -1 => {
  if (event.shiftKey) {
    return -1;
  }

  return 1;
};

const isRegionKey = (event: KeyboardEvent): boolean =>
  event.key === "F6" && !event.metaKey && !event.ctrlKey && !event.altKey;

const isBlockedTyping = (event: KeyboardEvent): boolean =>
  isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey;

const onStudioKey = (event: KeyboardEvent): void => {
  if (event.defaultPrevented || event.repeat) {
    return;
  }

  if (isRegionKey(event)) {
    event.preventDefault();
    moveRegion(toRegionStep(event));

    return;
  }

  if (findElement(document.body, '[role="dialog"][aria-modal="true"]')) {
    return;
  }

  const hit = KEYED.find(([key]) => matchesKey(key, event, IS_MAC));

  if (!hit || isBlockedTyping(event)) {
    return;
  }

  event.preventDefault();
  runCommand(hit[1]);
};

const useStudioKeys = (): void => {
  useEffect(() => {
    listenForCommands();
    globalThis.addEventListener("keydown", onStudioKey);

    return (): void => globalThis.removeEventListener("keydown", onStudioKey);
  }, []);
};

const toStudioCommands = (actions: StudioActions | null): Command[] => {
  if (actions) {
    return studioCommands(actions);
  }

  return [];
};

const useStudioCommands = (): RefObject<StudioActions | null> => {
  const actions = useRef<StudioActions | null>(null);

  useCommands(() => toStudioCommands(actions.current));
  useStudioKeys();

  return actions;
};

export { moveRegion, useStudioCommands };

export type { StudioActions };
