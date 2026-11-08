import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { lofiCss } from "../../../shared/lofi.js";
import { frameTokenOf, postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { readBlob } from "../../platform/http.js";

let cssLoad: Promise<string> | null = null;

const toBase64 = (bytes: Uint8Array): string => {
  let text = "";
  const step = 0x80_00;

  for (let index = 0; index < bytes.length; index += step) {
    text += String.fromCharCode(...bytes.subarray(index, index + step));
  }

  return btoa(text);
};

const fetchLofiCss = async (): Promise<string> => {
  try {
    const blob = await readBlob(
      new URL(
        "../../assets/fonts/kalam-latin-400-normal.woff2",
        import.meta.url
      ).href
    );

    const buffer = await blob.arrayBuffer();

    return lofiCss(
      `data:font/woff2;base64,${toBase64(new Uint8Array(buffer))}`
    );
  } catch (error: unknown) {
    cssLoad = null;
    console.error("[lofi] font load failed", error);

    return lofiCss("data:font/woff2;base64,");
  }
};

const loadLofiCss = (): Promise<string> => {
  cssLoad ??= fetchLofiCss();

  return cssLoad;
};

interface LofiFrame extends BridgeFrame {
  directionId: string | null;
}

const stageFrames = (
  stage: HTMLElement | null,
  kind: ProjectKind,
  currentId: string | null
): LofiFrame[] => {
  if (!stage) {
    return [];
  }

  const out: LofiFrame[] = [];

  for (const element of stage.querySelectorAll<HTMLIFrameElement>(
    "iframe.frame"
  )) {
    const token = frameTokenOf(element);

    if (!token) {
      continue;
    }

    const host = element.closest<HTMLElement>("[data-direction-id], .artboard");
    const directionId = host?.dataset.directionId ?? currentId;
    out.push({
      directionId,
      element,
      key: token,
      kind,
      token,
      url: element.src,
    });
  }

  return out;
};

const useLofiFrames = (
  stageRef: RefObject<HTMLElement | null>,
  kind: ProjectKind,
  currentId: string | null,
  lofi: readonly string[]
): void => {
  const sent = useRef(new WeakMap<HTMLIFrameElement, boolean>());
  const latest = useRef({ currentId, kind, lofi });
  latest.current = { currentId, kind, lofi };

  const frames = (): LofiFrame[] =>
    stageFrames(
      stageRef.current,
      latest.current.kind,
      latest.current.currentId
    );

  const wants = (frame: LofiFrame): boolean =>
    frame.directionId !== null &&
    latest.current.lofi.includes(frame.directionId);

  const sync = (frame: LofiFrame, force: boolean): void => {
    const { element } = frame;

    if (!element) {
      return;
    }

    const on = wants(frame);

    if (!force && (sent.current.get(element) ?? false) === on) {
      return;
    }

    sent.current.set(element, on);

    if (!on) {
      postToFrame(frame, { css: "", type: "lofi-preview" });

      return;
    }

    const sendCss = async (): Promise<void> => {
      const css = await loadLofiCss();

      if (sent.current.get(element) === true && wants(frame)) {
        postToFrame(frame, { css, type: "lofi-preview" });
      }
    };

    void sendCss();
  };

  useBridge(frames, (frame: BridgeFrame, message: BridgeToParent) => {
    if (message.type !== "ready") {
      return;
    }

    const found = frames().find((item) => item.element === frame.element);

    if (found) {
      sync(found, true);
    }
  });

  const key = lofi.join(",");
  useEffect(() => {
    for (const frame of frames()) {
      sync(frame, false);
    }
  });
  useEffect(() => {
    if (key) {
      void loadLofiCss();
    }
  }, [key]);
};

export { useLofiFrames };
