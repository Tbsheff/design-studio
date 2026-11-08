import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const AttachmentOverlay = ({
  children,
  className,
}: SlotProps): ReactElement => (
  <div
    className={cn(
      "absolute inset-0 inline-flex items-center justify-center",
      "rounded bg-foreground/45 text-background backdrop-blur-[1px]",
      className
    )}
    data-slot="attachment-overlay"
  >
    {children}
  </div>
);

export { AttachmentOverlay };
