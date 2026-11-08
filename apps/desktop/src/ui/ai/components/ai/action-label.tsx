import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const ActionLabel = ({ children, className }: SlotProps): ReactElement => (
  <span className={cn("text-foreground", className)} data-slot="action-label">
    {children}
  </span>
);

export { ActionLabel };
