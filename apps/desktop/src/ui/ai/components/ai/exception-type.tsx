import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const ExceptionType = ({ children, className }: SlotProps): ReactElement => (
  <span
    className={cn(
      "shrink-0 mt-0.5",
      "font-mono text-xs font-medium",
      "rounded bg-destructive/10 text-destructive",
      "px-1.5 py-0.5",
      className
    )}
    data-slot="exception-type"
  >
    {children}
  </span>
);

export { ExceptionType };
