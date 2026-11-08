import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const AttachmentMedia = ({ children, className }: SlotProps): ReactElement => (
  <div
    className={cn(
      "relative shrink-0 overflow-hidden rounded",
      "inline-flex items-center justify-center",
      "bg-surface-elevated text-muted-foreground",
      "in-data-[layout=row]:size-9",
      "in-data-[layout=card]:size-full",
      "in-data-[layout=card]:rounded-outer",
      "in-data-[state=error]:bg-destructive/10",
      "in-data-[state=error]:text-destructive",
      className
    )}
    data-slot="attachment-media"
  >
    {children}
  </div>
);

export { AttachmentMedia };
