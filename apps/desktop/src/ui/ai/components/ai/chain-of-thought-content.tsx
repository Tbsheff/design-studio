import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

const ChainOfThoughtContent = ({
  children,
  className,
}: SlotProps): ReactElement => {
  const panel = useElementRender(
    "div",
    cn(
      "overflow-hidden",
      "h-(--collapsible-panel-height)",
      "transition-[height] duration-150 ease-out",
      "data-starting-style:h-0 data-ending-style:h-0",
      className
    )
  );

  return (
    <Collapsible.Panel data-slot="chain-of-thought-content" render={panel}>
      <div className="flex flex-col">
        <span aria-hidden className="w-px h-4 ml-4 bg-border" />
        {children}
      </div>
    </Collapsible.Panel>
  );
};

export { ChainOfThoughtContent };
