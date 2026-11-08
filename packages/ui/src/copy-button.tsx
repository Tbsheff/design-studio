import { useCallback, useEffect, useState } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copyText } from "./copy-text.js";
import { Icon } from "./icon.js";

type CopyState = "idle" | "copied" | "failed";

const RESET_MS = 1400;
const COPY_ICON_SIZE = 14;

const TIPS: Record<Exclude<CopyState, "idle">, string> = {
  copied: "Copied",
  failed: "Copy failed",
};

const toTip = (state: CopyState, label: string): string => {
  if (state === "idle") {
    return label;
  }

  return TIPS[state];
};

const toAnnouncement = (state: CopyState): string => {
  if (state === "copied") {
    return TIPS.copied;
  }

  return "";
};

const reportCopy = async (
  copied: Promise<boolean>,
  report: (state: CopyState) => void
): Promise<void> => {
  const isCopied = await copied;

  if (isCopied) {
    report("copied");

    return;
  }

  report("failed");
};

const CopyButton = ({
  text = "",
  getText = null,
  label = "Copy",
  className = "",
}: {
  text?: string;
  getText?: (() => string) | null;
  label?: string;
  className?: string;
}): ReactElement => {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") {
      return;
    }

    const timer = globalThis.setTimeout(() => setState("idle"), RESET_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [state]);

  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      void reportCopy(copyText(getText?.() ?? text), setState);
    },
    [text, getText]
  );

  return (
    <button
      type="button"
      className={`icon-btn small copy-btn ${className}`}
      data-state={state}
      aria-label={label}
      data-tip={toTip(state, label)}
      data-tip-side="top"
      onClick={onClick}
    >
      <span className="copy-icon" aria-hidden="true">
        <Icon name="copy" size={COPY_ICON_SIZE} />
      </span>
      <span className="copy-icon copy-done" aria-hidden="true">
        <Icon name="check" size={COPY_ICON_SIZE} />
      </span>
      <span className="sr-only" aria-live="polite">
        {toAnnouncement(state)}
      </span>
    </button>
  );
};

export { CopyButton };
