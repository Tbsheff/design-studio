import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_MS = 4000;

interface NoticeApi {
  readonly clearNotice: () => void;
  readonly notice: string | null;
  readonly notify: (message: string) => void;
}

const useNotice = (): NoticeApi => {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNotice = useCallback((): void => {
    setNotice(null);
  }, []);

  const notify = useCallback((message: string): void => {
    setNotice(message);

    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = globalThis.setTimeout((): void => {
      setNotice(null);
    }, NOTICE_MS);
  }, []);

  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );

  return { clearNotice, notice, notify };
};

export { useNotice };
