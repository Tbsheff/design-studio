import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { startTransition, useCallback } from "react";

import { copy } from "./copy.js";
import { toCopyIcon, toCopyLabel } from "./other-styles-model.js";
import type { AuthoredCssState } from "./use-authored-css.js";
import { useCopyCss } from "./use-copy-css.js";

const toVisibleLabel = (isIdle: boolean, label: string): string => {
  if (isIdle) {
    return copy.cssLabel;
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
      className="btn ghost small has-icon ins-copy-css"
      data-tip={copy.copyCss}
      data-tip-align="end"
      onClick={handleCopy}
    >
      <Icon name={toCopyIcon(state)} size={13} />
      <span aria-live="polite">{toVisibleLabel(state === "idle", label)}</span>
    </button>
  );
};

export { CopyCssButton };
