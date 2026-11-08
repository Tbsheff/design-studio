import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { chipVariants } from "../../ai/components/ai/chip-variants.js";
import { cn } from "../../ai/lib/utils.js";
import { copy } from "./copy.js";
import { RunContextText } from "./run-context-text.js";
import type { RunCanvasChip } from "./use-run-canvas.js";

const CHIP_CLASS = cn(
  chipVariants({ size: "sm" }),
  "chip max-w-full py-0.5 pr-0.5 text-muted-foreground"
);

const RunContextPill = ({
  chip,
  tip,
}: {
  chip: RunCanvasChip;
  tip: string;
}): ReactElement => {
  const { onRemove: handleRemove } = chip;

  return (
    <span
      className={CHIP_CLASS}
      data-slot="chip"
      data-size="sm"
      data-tip={tip}
      data-tip-side="top"
    >
      <Icon name="frame" size={12} />
      <RunContextText chip={chip} />
      <button
        type="button"
        className="icon-btn chip-x"
        aria-label={copy.removeCanvasContext}
        data-tip={copy.removeCanvasContext}
        onClick={handleRemove}
      >
        <Icon name="close" size={12} />
      </button>
    </span>
  );
};

export { RunContextPill };
