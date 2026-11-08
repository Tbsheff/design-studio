import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const ActionIcon = ({ children, className }: SlotProps): ReactElement => (
  <span
    aria-hidden
    className={cn(
      "size-4 inline-flex items-center justify-center shrink-0",
      className
    )}
    data-slot="action-icon"
  >
    {children ?? <span className="size-2 rounded-full bg-current" />}
  </span>
);

export { ActionIcon };
