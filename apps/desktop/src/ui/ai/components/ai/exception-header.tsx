import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const ExceptionHeader = ({ children, className }: SlotProps): ReactElement => (
  <header
    className={cn("flex items-center gap-2.5 px-4 h-11", className)}
    data-slot="exception-header"
  >
    {children}
  </header>
);

export { ExceptionHeader };
