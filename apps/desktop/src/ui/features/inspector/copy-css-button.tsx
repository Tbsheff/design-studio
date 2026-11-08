import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { startTransition, useCallback } from "react";

import { copy } from "./copy.js";
import { toCopyIcon, toCopyLabel } from "./other-styles-model.js";
import type { AuthoredCssState } from "./use-authored-css.js";
import { useCopyCss } from "./use-copy-css.js";

const toTip = (isIdle: boolean, label: string): string => {
  if (isIdle) {
    return copy.copyCss;
  }

  return label;
};

const CopyCssButton = ({
  authored,
}: {
  readonly authored: AuthoredCssState;
}): ReactElement => {
  const { copyCss, state } = useCopyCss(authored);
  const label = toCopyLabel(state);

  const handleCopy = useCallback(() => {
    startTransition(async () => {
      await copyCss();
    });
  }, [copyCss]);

  return (
    <button
      type="button"
      className="icon-btn small ins-copy-css"
      data-tip={toTip(state === "idle", label)}
      data-tip-align="end"
      onClick={handleCopy}
    >
      <Icon name={toCopyIcon(state)} size={14} />
      <span className="sr-only" aria-live="polite">
        {label}
      </span>
    </button>
  );
};

export { CopyCssButton };
