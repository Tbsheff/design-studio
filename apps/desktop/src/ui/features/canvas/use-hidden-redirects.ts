import { useCallback, useState } from "react";

import {
  MAX_HIDDEN_REDIRECTS,
  readHiddenRedirects,
  writeHiddenRedirects,
} from "./app-canvas-routes-model.js";
import type { FrameRedirect } from "./frame-label-model.js";

interface HiddenRedirects {
  readonly dismiss: () => void;
  readonly shown: FrameRedirect | null;
}

const useHiddenRedirects = (
  projectId: string,
  redirect: FrameRedirect | null,
  isApp: boolean
): HiddenRedirects => {
  const [hidden, setHidden] = useState(() => readHiddenRedirects());

  let key: string | null = null;

  if (redirect) {
    key = `${projectId} ${redirect.from}>${redirect.to}`;
  }

  let shown: FrameRedirect | null = null;

  if (isApp && redirect && key && !hidden.includes(key)) {
    shown = redirect;
  }

  const dismiss = useCallback((): void => {
    if (!key) {
      return;
    }

    const next = [...hidden.filter((item) => item !== key), key].slice(
      -MAX_HIDDEN_REDIRECTS
    );

    writeHiddenRedirects(next);
    setHidden(next);
  }, [hidden, key]);

  return { dismiss, shown };
};

export { useHiddenRedirects };
