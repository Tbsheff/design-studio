import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import { DisclosureChevron } from "./disclosure-chevron";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

const ChainOfThoughtHeader = ({
  children,
  className,
}: SlotProps): ReactElement => {
  const header = useElementRender(
    "button",
    cn(
      "inline-flex items-center self-start gap-2 cursor-pointer select-none text-left bg-transparent",
      "px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      "transition-colors",
      className
    )
  );

  return (
    <Collapsible.Trigger data-slot="chain-of-thought-header" render={header}>
      {children}
      <DisclosureChevron scope="cot" />
    </Collapsible.Trigger>
  );
};

export { ChainOfThoughtHeader };
