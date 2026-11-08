import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import { attachmentVariants } from "./attachment-variants";
import type { SlotProps } from "./slot-props";

interface AttachmentProps extends SlotProps {
  readonly "data-tip"?: string;
  readonly "data-tip-align"?: "end" | "start";
  readonly "data-tip-side"?: "top";
  readonly layout?: "card" | "row";
  readonly state?: "default" | "error";
}

const Attachment = ({
  children,
  className,
  "data-tip": tip,
  "data-tip-align": tipAlign,
  "data-tip-side": tipSide,
  layout = "row",
  state = "default",
}: AttachmentProps): ReactElement => (
  <div
    className={cn(attachmentVariants({ className, layout, state }))}
    data-layout={layout}
    data-slot="attachment"
    data-state={state}
    data-tip={tip}
    data-tip-align={tipAlign}
    data-tip-side={tipSide}
  >
    {children}
  </div>
);

export { Attachment };
