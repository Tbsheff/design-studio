import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { BridgeToParent, ProjectKind } from "../../../shared/contracts.js";
import { lofiCss } from "../../../shared/lofi.js";
import { frameTokenOf, postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { readBlob } from "../../platform/http.js";

let cssLoad: Promise<string> | null = null;

function toBase64(bytes: Uint8Array): string {
  let text = "";
  const step = 0x80_00;

  for (let i = 0; i < bytes.length; i += step) {
    text += String.fromCharCode(...bytes.subarray(i, i + step));
  }

  return btoa(text);
}

function loadLofiCss(): Promise<string> {
  cssLoad ??= readBlob(
    new URL("../../assets/fonts/kalam-latin-400-normal.woff2", import.meta.url)
      .href
  )
    .then((blob) => blob.arrayBuffer())
    .then((buffer) =>
      lofiCss(`data:font/woff2;base64,${toBase64(new Uint8Array(buffer))}`)
    )
    .catch((error: unknown) => {
      cssLoad = null;
      console.error("[lofi] font load failed", error);

      return lofiCss("data:font/woff2;base64,");
    });

  return cssLoad;
}

interface LofiFrame extends BridgeFrame {
  directionId: string | null;
}

function stageFrames(
  stage: HTMLElement | null,
  kind: ProjectKind,
  currentId: string | null
): LofiFrame[] {
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
}

export function useLofiFrames(
  stageRef: RefObject<HTMLElement | null>,
  kind: ProjectKind,
  currentId: string | null,
  lofi: readonly string[]
): void {
  const sent = useRef(new WeakMap<HTMLIFrameElement, boolean>());
  const latest = useRef({ currentId, kind, lofi });
  latest.current = { currentId, kind, lofi };

  const frames = () =>
    stageFrames(
      stageRef.current,
      latest.current.kind,
      latest.current.currentId
    );

  const wants = (frame: LofiFrame) =>
    frame.directionId !== null &&
    latest.current.lofi.includes(frame.directionId);

  const sync = (frame: LofiFrame, force: boolean) => {
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

    void loadLofiCss().then((css) => {
      if (sent.current.get(element) === true && wants(frame)) {
        postToFrame(frame, { css, type: "lofi-preview" });
      }
    });
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
}
