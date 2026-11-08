import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactElement } from "react";

import { cn } from "../../lib/utils";
import type { SlotProps } from "./slot-props";
import { useElementRender } from "./use-element-render";

interface ActionProps extends SlotProps {
  readonly "data-shell-edits"?: number | string | null;
  readonly "data-state"?: string;
  readonly "data-tool"?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
}

const Action = ({
  children,
  className,
  "data-shell-edits": shellEdits,
  "data-state": state,
  "data-tool": tool,
  onOpenChange,
  open,
}: ActionProps): ReactElement => {
  const root = useElementRender(
    "div",
    cn("group/action flex flex-col text-sm", className)
  );

  return (
    <Collapsible.Root
      data-shell-edits={shellEdits}
      data-slot="action"
      data-state={state}
      data-tool={tool}
      onOpenChange={onOpenChange}
      open={open}
      render={root}
    >
      {children}
    </Collapsible.Root>
  );
};

export { Action };
