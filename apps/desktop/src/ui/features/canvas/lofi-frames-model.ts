import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { lofiCss } from "../../../shared/lofi.js";
import { frameTokenOf, postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { readBlob } from "../../platform/http.js";
import { listStageFrameElements } from "../../platform/stage-dom.js";

let cssLoad: Promise<string> | null = null;

const toBase64 = (bytes: Uint8Array): string => {
  let text = "";
  const step = 0x80_00;

  for (let index = 0; index < bytes.length; index += step) {
    text += String.fromCodePoint(...bytes.subarray(index, index + step));
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
    reportError(error);

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

  return listStageFrameElements(stage).flatMap((found) => {
    const token = frameTokenOf(found.element);

    if (!token) {
      return [];
    }

    const { src: url } = found.element;

    return [
      {
        directionId: found.directionId ?? currentId,
        element: found.element,
        key: token,
        kind,
        token,
        url,
      },
    ];
  });
};

const useLofiFrames = (
  stageRef: RefObject<HTMLElement | null>,
  kind: ProjectKind,
  currentId: string | null,
  lofi: readonly string[]
): void => {
  const sent = useRef(new WeakMap<HTMLIFrameElement, boolean>());

  const frames = useCallback(
    (): LofiFrame[] => stageFrames(stageRef.current, kind, currentId),
    [stageRef, kind, currentId]
  );

  const wants = useCallback(
    (frame: LofiFrame): boolean =>
      frame.directionId !== null && lofi.includes(frame.directionId),
    [lofi]
  );

  const sync = useCallback(
    (frame: LofiFrame, force: boolean): void => {
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
    },
    [wants]
  );

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
