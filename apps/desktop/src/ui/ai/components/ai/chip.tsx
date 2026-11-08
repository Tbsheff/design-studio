// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { useRender } from "@base-ui/react/use-render";
import type { VariantProps } from 'class-variance-authority';
import { cn } from "../../lib/utils";
import { chipVariants } from "./chip-variants.js";

type ChipProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof chipVariants>;

const Chip = ({
  size = "default",
  className,
  render,
  ...props
}: ChipProps): React.JSX.Element =>
  useRender({
    defaultTagName: "span",
    props: {
      ...props,
      className: cn(chipVariants({ className, size })),
      "data-size": size,
      "data-slot": "chip",
    },
    render,
  });

export { Chip };
