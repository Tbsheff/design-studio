import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { copy } from "./copy.js";
import type { PreviewPort } from "./deps.js";

const NOTICE_MS = 4000;

const useTextRangeNotice = (
  port: RefObject<PreviewPort | null>,
  selector: string | null
): string | null => {
  const [notice, setNotice] = useState<string | null>(null);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    const listen = port.current?.listen;

    if (!listen || selector === null) {
      return;
    }

    return listen((message) => {
      if (
        message.type !== "text-edit-blocked" ||
        shown.current.has(message.selector)
      ) {
        return;
      }

      shown.current.add(message.selector);
      setNotice(copy.mixedNote);
    });
  }, [port, selector]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const timer = globalThis.setTimeout(() => setNotice(null), NOTICE_MS);

    return (): void => {
      globalThis.clearTimeout(timer);
    };
  }, [notice]);

  return notice;
};

export { useTextRangeNotice };
