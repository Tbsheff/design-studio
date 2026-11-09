import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { stageFrames } from "./lofi-frames-model.js";
import {
  isOutlineOn,
  toggleOutline,
  useOutlineProjects,
} from "./outline-view-model.js";

interface OutlineSwitch {
  readonly on: boolean;
  readonly onToggle: () => void;
}

const hasCommandModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

const isOutlineChord = (event: KeyboardEvent): boolean =>
  event.code === "KeyO" &&
  event.shiftKey &&
  !event.repeat &&
  !hasCommandModifier(event);

const useOutlineKey = (onToggle: () => void): void => {
  const latest = useRef(onToggle);

  useEffect(() => {
    latest.current = onToggle;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!isOutlineChord(event) || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      latest.current();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const useOutlineView = (
  stageRef: RefObject<HTMLElement | null>,
  kind: ProjectKind,
  currentId: string | null,
  projectId: string
): OutlineSwitch => {
  const projects = useOutlineProjects();
  const isOn = isOutlineOn(projects, projectId);
  const sent = useRef(new WeakMap<HTMLIFrameElement, boolean>());

  const frames = useCallback(
    () => stageFrames(stageRef.current, kind, currentId),
    [stageRef, kind, currentId]
  );

  const sync = useCallback(
    (frame: BridgeFrame, force: boolean): void => {
      const { element } = frame;

      if (!element) {
        return;
      }

      const prior = sent.current.get(element) ?? false;

      if (prior === isOn && (!force || !isOn)) {
        return;
      }

      sent.current.set(element, isOn);
      postToFrame(frame, { isOn, type: "outline-view" });
    },
    [isOn]
  );

  useBridge(frames, (frame: BridgeFrame, message: BridgeToParent) => {
    if (message.type === "ready") {
      sync(frame, true);
    }
  });

  useEffect(() => {
    for (const frame of frames()) {
      sync(frame, false);
    }
  });

  const onToggle = useCallback(
    (): void => toggleOutline(projectId),
    [projectId]
  );

  useOutlineKey(onToggle);

  return { on: isOn, onToggle };
};

export { useOutlineView };

export type { OutlineSwitch };
