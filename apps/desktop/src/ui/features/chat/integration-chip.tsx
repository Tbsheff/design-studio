import { routes } from "@design-studio/actions/integration/routes";
import type { ReactElement } from "react";

import { chipVariants } from "../../ai/components/ai/chip.js";
import { useAction } from "../../platform/query.js";
import { chipCopy } from "./integration-chip-copy.js";
import { toActiveNames } from "./integration-chip-model.js";

const LIST_INPUT = { limit: 200 } as const;

const CHIP_CLASS = `${chipVariants({ size: "sm" })} chip max-w-full`;

const IntegrationChip = (): ReactElement | null => {
  const read = useAction(routes.listIntegration, LIST_INPUT);
  const names = toActiveNames(read.data?.items ?? []);

  if (names.length === 0) {
    return null;
  }

  return (
    <div className="chips flex flex-wrap gap-1 px-2 pt-2">
      <span className={CHIP_CLASS} data-tip={chipCopy.tip} data-tip-side="top">
        {chipCopy.label}
        <span className="chip-text min-w-0 truncate font-mono text-foreground">
          {names.join(", ")}
        </span>
      </span>
    </div>
  );
};

export { IntegrationChip };
