import { routes as exportRoutes } from "@design-studio/actions/export/routes";
import { useCallback, useEffect, useState, useTransition } from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { errorText } from "../../api.js";
import { IS_MAC } from "../../canvas-hook-slots.js";
import { COPY_PNG_EVENT } from "../../domain/copy-png-events.js";
import type { CopyPngDetail } from "../../domain/copy-png-events.js";
import { setClipboardImage } from "../../platform/clipboard.js";
import { call } from "../../platform/http.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import {
  NOTICE_MS,
  PNG_SCALE,
  toCopiedText,
  toCopyFrame,
  toDecodedPng,
} from "./copy-png-model.js";

interface CopyPngInput {
  readonly active: CanvasFrame;
  readonly frames: readonly CanvasFrame[];
  readonly projectId: string;
  readonly selector: string | null;
  readonly versionId: string | null;
}

interface CopyTarget {
  readonly frame: CanvasFrame;
  readonly selector: string | null;
}

interface CopyPng {
  readonly dismiss: () => void;
  readonly notice: string | null;
}

const toDetail = (event: Event): CopyPngDetail | null => {
  if (event instanceof CustomEvent) {
    return event.detail as CopyPngDetail | null;
  }

  return null;
};

const toTarget = (input: CopyPngInput, frameId: string | null): CopyTarget => {
  const other = input.frames.find(
    (frame) => frame.id === frameId && frame.id !== input.active.id
  );

  if (other) {
    return { frame: other, selector: null };
  }

  return { frame: input.active, selector: input.selector };
};

const runCopy = async (
  input: CopyPngInput,
  frameId: string | null
): Promise<string> => {
  if (input.versionId === null) {
    return "Nothing to copy yet";
  }

  const target = toTarget(input, frameId);

  const file = await call(exportRoutes.exportExport, {
    format: "png",
    frames: [toCopyFrame(target.frame)],
    projectId: input.projectId,
    scale: PNG_SCALE,
    scope: "frame",
    selector: target.selector,
    versionId: input.versionId,
  });

  const png = toDecodedPng(file);
  await setClipboardImage(png.blob);

  return toCopiedText(png.size);
};

const useCopyPng = (input: CopyPngInput): CopyPng => {
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const latest = useLatest(input);
  const dismiss = useCallback((): void => setNotice(null), []);

  const copyFrame = useCallback(
    (frameId: string | null): void => {
      startTransition(async () => {
        try {
          setNotice(await runCopy(latest.current, frameId));
        } catch (error) {
          setNotice(`Could not copy: ${errorText(error)}`);
        }
      });
    },
    [latest]
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        isTypingTarget(event.target) ||
        !matchesKey("copy-png", event, IS_MAC)
      ) {
        return;
      }

      event.preventDefault();
      copyFrame(null);
    };

    const handleEvent = (event: Event): void =>
      copyFrame(toDetail(event)?.frameId ?? null);

    globalThis.addEventListener("keydown", handleKey);
    globalThis.addEventListener(COPY_PNG_EVENT, handleEvent);

    return (): void => {
      globalThis.removeEventListener("keydown", handleKey);
      globalThis.removeEventListener(COPY_PNG_EVENT, handleEvent);
    };
  }, [copyFrame]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const timer = globalThis.setTimeout(dismiss, NOTICE_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [dismiss, notice]);

  return { dismiss, notice };
};

export { useCopyPng };

export type { CopyPng, CopyPngInput };
