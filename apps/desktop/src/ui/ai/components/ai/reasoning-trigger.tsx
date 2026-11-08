import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import { DisclosureChevron } from "./disclosure-chevron";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

const ReasoningTrigger = ({
  children,
  className,
}: SlotProps): ReactElement => {
  const trigger = useElementRender(
    "button",
    cn(
      "justify-self-start cursor-pointer select-none bg-transparent",
      "inline-flex items-center gap-1.5 -ml-2 px-2 py-1 rounded text-sm",
      "text-muted-foreground hover:text-foreground hover:bg-accent",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      "transition-colors",
      className
    )
  );

  return (
    <Collapsible.Trigger data-slot="reasoning-trigger" render={trigger}>
      <DisclosureChevron scope="reasoning" />
      {children}
    </Collapsible.Trigger>
  );
};

export { ReasoningTrigger };
