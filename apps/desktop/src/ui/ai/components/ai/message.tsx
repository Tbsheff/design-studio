import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

interface MessageProps extends SlotProps {
  readonly type?: "incoming" | "outgoing";
}

const Message = ({
  children,
  className,
  type = "outgoing",
}: MessageProps): ReactElement => (
  <div
    className={cn(
      "group/message flex w-full gap-3",
      "data-[type=outgoing]:flex-row-reverse",
      className
    )}
    data-slot="message"
    data-type={type}
  >
    {children}
  </div>
);

export { Message };
