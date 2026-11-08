import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const MessageContent = ({ children, className }: SlotProps): ReactElement => (
  <div
    className={cn(
      "flex min-w-0 flex-1 flex-col gap-1.5",
      "group-data-[type=outgoing]/message:items-end",
      className
    )}
    data-slot="message-content"
  >
    {children}
  </div>
);

export { MessageContent };
