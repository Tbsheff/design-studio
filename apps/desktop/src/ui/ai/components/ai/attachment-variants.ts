import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const attachmentVariants = cva(
  cn(
    "relative text-foreground",
    "ring ring-border",
    "[&_[data-slot=attachment-media-img]]:size-full",
    "[&_[data-slot=attachment-media-img]]:object-cover",
    "[&:is(button,a)]:cursor-pointer",
    "[&:is(button,a)]:transition-colors",
    "[&:is(a)]:no-underline [&:is(a)]:text-foreground",
    "[&:is(button,a):focus-visible]:outline-none",
    "[&:is(button,a):focus-visible]:ring-2",
    "[&:is(button,a):focus-visible]:ring-primary"
  ),
  {
    defaultVariants: { layout: "row", state: "default" },
    variants: {
      layout: {
        card: cn(
          "inline-flex shrink-0 aspect-square size-16 rounded-outer",
          "[&:is(button,a):hover]:ring-2 [&:is(button,a):hover]:ring-border"
        ),
        row: cn(
          "inline-flex items-center gap-2.5 rounded-outer p-1.5 pr-2",
          "bg-surface",
          "[&:is(button,a):hover]:bg-accent"
        ),
      },
      state: {
        default: "",
        error: "bg-destructive/5 ring-destructive/40",
      },
    },
  }
);

export { attachmentVariants };
