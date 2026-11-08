import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

const ReasoningContent = ({
  children,
  className,
}: SlotProps): ReactElement => {
  const panel = useElementRender(
    "div",
    cn(
      "col-span-2 overflow-hidden",
      "h-(--collapsible-panel-height)",
      "transition-[height] duration-150 ease-out",
      "data-starting-style:h-0 data-ending-style:h-0",
      className
    )
  );

  return (
    <Collapsible.Panel data-slot="reasoning-content" render={panel}>
      <div className="pl-6 py-2 text-sm text-muted-foreground">{children}</div>
    </Collapsible.Panel>
  );
};

export { ReasoningContent };
