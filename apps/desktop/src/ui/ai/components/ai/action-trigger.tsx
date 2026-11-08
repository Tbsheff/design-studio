import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import { DisclosureChevron } from "./disclosure-chevron";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

interface ActionTriggerProps extends SlotProps {
  readonly "data-tip"?: string;
}

const ActionTrigger = ({
  children,
  className,
  "data-tip": tip,
}: ActionTriggerProps): ReactElement => {
  const trigger = useElementRender(
    "button",
    cn(
      "inline-flex items-center self-start gap-2 cursor-pointer select-none text-left bg-transparent",
      "-mx-2 px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      "transition-colors",
      className
    )
  );

  return (
    <Collapsible.Trigger
      data-slot="action-trigger"
      data-tip={tip}
      render={trigger}
    >
      {children}
      <DisclosureChevron scope="action" />
    </Collapsible.Trigger>
  );
};

export { ActionTrigger };
