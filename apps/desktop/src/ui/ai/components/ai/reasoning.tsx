import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

interface ReasoningProps extends SlotProps {
  readonly "data-testid"?: string;
}

const Reasoning = ({
  children,
  className,
  "data-testid": testId,
}: ReasoningProps): ReactElement => {
  const root = useElementRender(
    "div",
    cn("group grid grid-cols-[1fr_auto] items-center gap-x-2", className)
  );

  return (
    <Collapsible.Root data-slot="reasoning" data-testid={testId} render={root}>
      {children}
    </Collapsible.Root>
  );
};

export { Reasoning };
