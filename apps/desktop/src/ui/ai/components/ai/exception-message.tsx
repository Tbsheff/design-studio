import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const ExceptionMessage = ({
  children,
  className,
}: SlotProps): ReactElement => (
  <div
    className={cn("min-w-0 flex-1 text-sm text-foreground", className)}
    data-slot="exception-message"
  >
    {children}
  </div>
);

export { ExceptionMessage };
