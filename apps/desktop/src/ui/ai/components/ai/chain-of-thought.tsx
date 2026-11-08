import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

interface ChainOfThoughtProps extends SlotProps {
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
}

const ChainOfThought = ({
  children,
  className,
  onOpenChange,
  open,
}: ChainOfThoughtProps): ReactElement => {
  const root = useElementRender(
    "div",
    cn("group/cot flex flex-col text-sm", className)
  );

  return (
    <Collapsible.Root
      data-slot="chain-of-thought"
      onOpenChange={onOpenChange}
      open={open}
      render={root}
    >
      {children}
    </Collapsible.Root>
  );
};

export { ChainOfThought };
