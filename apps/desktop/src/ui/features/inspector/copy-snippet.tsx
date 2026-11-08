import { Icon } from "@design-studio/ui";
import { startTransition, useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

interface Props {
  readonly code: string;
}

const ICON_SIZE = 13;

const COPIED_MS = 1500;

const toCopyIcon = (isCopied: boolean): "check" | "copy" => {
  if (isCopied) {
    return "check";
  }

  return "copy";
};

const toCopyLabel = (isCopied: boolean): string => {
  if (isCopied) {
    return "Copied";
  }

  return "Copy";
};

const CopySnippet = ({ code }: Props): ReactElement => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      setIsCopied(false);
    }, COPIED_MS);

    return (): void => {
      globalThis.clearTimeout(timer);
    };
  }, [isCopied]);

  const handleCopy = useCallback((): void => {
    startTransition(async () => {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
    });
  }, [code]);

  return (
    <button
      type="button"
      className="btn ghost small has-icon"
      onClick={handleCopy}
    >
      <Icon name={toCopyIcon(isCopied)} size={ICON_SIZE} />
      <span aria-live="polite">{toCopyLabel(isCopied)}</span>
    </button>
  );
};

export { CopySnippet };
