import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";

const messageTextVariants = cva("min-w-0 text-sm/6.5", {
  defaultVariants: { variant: "plain" },
  variants: {
    variant: {
      bubble:
        "w-fit max-w-[75%] rounded-outer bg-surface-elevated px-3 py-2 ring ring-border",
      plain:
        "[[data-slot=message-avatar]+[data-slot=message-content]>&:first-child]:pt-2",
    },
  },
});

interface MessageTextProps
  extends SlotProps, VariantProps<typeof messageTextVariants> {
  readonly "data-streaming"?: boolean | null;
}

const MessageText = ({
  children,
  className,
  "data-streaming": isStreaming,
  variant,
}: MessageTextProps): ReactElement => (
  <div
    className={cn(messageTextVariants({ className, variant }))}
    data-slot="message-text"
    data-streaming={isStreaming}
    data-variant={variant ?? "plain"}
  >
    {children}
  </div>
);

export { MessageText };
