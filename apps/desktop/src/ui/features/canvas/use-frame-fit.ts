import { routes } from "@design-studio/actions/canvas/routes";
import { useCallback, useEffect, useState, useTransition } from "react";

import { errorText } from "../../api.js";
import { call } from "../../platform/http.js";
import { useLatest } from "../../platform/use-latest.js";
import { copy } from "./copy.js";
import {
  FIT_NOTICE_MS,
  FRAME_FIT_EVENT,
  toFitFrameIds,
  toFitNotice,
} from "./frame-fit-model.js";

interface FrameFit {
  readonly dismiss: () => void;
  readonly isPending: boolean;
  readonly notice: string | null;
}

const useFrameFit = (projectId: string): FrameFit => {
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latest = useLatest(projectId);
  const dismiss = useCallback((): void => setNotice(null), []);

  const fitFrames = useCallback(
    (frameIds: readonly string[]): void => {
      if (frameIds.length === 0) {
        return;
      }

      setNotice(null);

      startTransition(async () => {
        try {
          const output = await call(routes.setFrameHeightsCanvas, {
            frames: [...frameIds],
            projectId: latest.current,
          });

          setNotice(toFitNotice(output));
        } catch (error) {
          setNotice(`${copy.frameFitFailed}${errorText(error)}`);
        }
      });
    },
    [latest]
  );

  useEffect(() => {
    const handleEvent = (event: Event): void => fitFrames(toFitFrameIds(event));

    globalThis.addEventListener(FRAME_FIT_EVENT, handleEvent);

    return (): void => {
      globalThis.removeEventListener(FRAME_FIT_EVENT, handleEvent);
    };
  }, [fitFrames]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const timer = globalThis.setTimeout(dismiss, FIT_NOTICE_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [dismiss, notice]);

  return { dismiss, isPending, notice };
};

export { useFrameFit };

export type { FrameFit };
