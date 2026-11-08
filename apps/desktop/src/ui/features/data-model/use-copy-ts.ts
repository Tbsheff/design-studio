import { useCallback, useState } from "react";

import { copyText } from "./deps.js";

type CopyState = "copied" | "failed" | "idle";

interface CopyTs {
  readonly copy: () => void;
  readonly state: CopyState;
}

interface CopyMark {
  readonly key: string;
  readonly state: CopyState;
}

const useCopyTs = (key: string, text: string): CopyTs => {
  const [mark, setMark] = useState<CopyMark | null>(null);

  const copy = useCallback((): void => {
    const run = async (): Promise<void> => {
      const isCopied = await copyText(text);

      if (isCopied) {
        setMark({ key, state: "copied" });
      } else {
        setMark({ key, state: "failed" });
      }
    };

    run();
  }, [key, text]);

  if (mark !== null && mark.key === key) {
    return { copy, state: mark.state };
  }

  return { copy, state: "idle" };
};

export { useCopyTs };

export type { CopyState };
