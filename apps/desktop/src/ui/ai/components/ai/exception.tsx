import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement, Ref } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

interface ExceptionProps extends SlotProps {
  readonly "data-long"?: boolean | string | null;
  readonly ref?: Ref<HTMLDivElement>;
  readonly role?: "alert" | "status";
}

const Exception = ({
  children,
  className,
  "data-long": isLong,
  ref,
  role,
}: ExceptionProps): ReactElement => {
  const root = useElementRender(
    "div",
    cn(
      "group/exception flex flex-col",
      "rounded-outer bg-surface ring ring-border",
      "overflow-hidden",
      className
    )
  );

  return (
    <Collapsible.Root
      data-long={isLong}
      data-slot="exception"
      ref={ref}
      render={root}
      role={role}
    >
      {children}
    </Collapsible.Root>
  );
};

export { Exception };
