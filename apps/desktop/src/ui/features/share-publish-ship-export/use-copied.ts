import { useEffect, useRef, useState } from "react";

const COPIED_MS = 1500;

type Copy = (key: string, text: string) => Promise<void>;

const useCopied = (): [string | null, Copy] => {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );

  const copy: Copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);

      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }

      timer.current = globalThis.setTimeout(() => setCopied(null), COPIED_MS);
    } catch {
      setCopied(null);
    }
  };

  return [copied, copy];
};

export { useCopied };
