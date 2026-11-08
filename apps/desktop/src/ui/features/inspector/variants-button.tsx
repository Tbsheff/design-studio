import { TRY_VARIANTS_COMMAND } from "@design-studio/contracts/element-variants";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { commandBlocker, runCommand } from "../../inspector-slots.js";
import { copy } from "./copy.js";
import { ICON_SIZE, toVariantsTip } from "./tools-model.js";

const VariantsButton = (): ReactElement => {
  const blocked = commandBlocker(TRY_VARIANTS_COMMAND);

  const handleVariants = useCallback((): void => {
    runCommand(TRY_VARIANTS_COMMAND);
  }, []);

  return (
    <button
      type="button"
      className="ins-tool"
      aria-label={copy.tryVariants}
      aria-disabled={Boolean(blocked)}
      data-tip={toVariantsTip(blocked ?? null)}
      data-testid="inspector-try-variants"
      onClick={handleVariants}
    >
      <Icon name="compare" size={ICON_SIZE} />
    </button>
  );
};

export { VariantsButton };
