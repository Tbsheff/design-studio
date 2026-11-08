import { useEffect, useState } from "react";

import { Icon } from "./Icon";

const textOf = (text: string | (() => string)): string =>
  typeof text === "function" ? text() : text;

const reportCopy = async (
  copied: Promise<boolean>,
  report: (state: "copied" | "failed") => void
): Promise<void> => {
  report((await copied) ? "copied" : "failed");
};

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    return false;
  }
};

const CopyButton = ({
  text,
  label = "Copy",
  className = "",
}: {
  text: string | (() => string);
  label?: string;
  className?: string;
}) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") {
      return;
    }

    const id = window.setTimeout(() => setState("idle"), 1400);

    return () => window.clearTimeout(id);
  }, [state]);

  const tip =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      className={`icon-btn small copy-btn ${className}`}
      data-state={state}
      aria-label={label}
      data-tip={tip}
      data-tip-side="top"
      onClick={(event) => {
        event.stopPropagation();
        void reportCopy(copyText(textOf(text)), setState);
      }}
    >
      <span className="copy-icon" aria-hidden="true">
        <Icon name="copy" size={14} />
      </span>
      <span className="copy-icon copy-done" aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Copied" : ""}
      </span>
    </button>
  );
};

export { copyText, CopyButton };
