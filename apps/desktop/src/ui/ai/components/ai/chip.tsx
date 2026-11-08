import type { VariantProps } from "class-variance-authority";
import type { ReactElement, ReactNode } from "react";

import { cn } from "../../lib/utils";
import { chipVariants } from "./chip-variants";

type TipSide = "bottom" | "left" | "right" | "top";

interface ChipProps extends VariantProps<typeof chipVariants> {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly "data-testid"?: string;
  readonly "data-tip"?: string;
  readonly "data-tip-side"?: TipSide;
}

const Chip = ({
  children,
  className,
  "data-testid": testId,
  "data-tip": tip,
  "data-tip-side": tipSide,
  size = "default",
}: ChipProps): ReactElement => (
  <span
    className={cn(chipVariants({ className, size }))}
    data-size={size}
    data-slot="chip"
    data-testid={testId}
    data-tip={tip}
    data-tip-side={tipSide}
  >
    {children}
  </span>
);

export { Chip };
