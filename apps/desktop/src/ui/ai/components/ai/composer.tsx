import { useMemo, useState } from "react";
import type { MouseEventHandler, ReactElement } from "react";

import { cn } from "../../lib/utils";
import { ComposerContext } from "./composer-context";
import type { SlotProps } from "./slot-props";

interface ComposerProps extends SlotProps {
  readonly onClick?: MouseEventHandler<HTMLDivElement>;
}

const toFlag = (isOn: boolean): "false" | "true" => {
  if (isOn) {
    return "true";
  }

  return "false";
};

const Composer = ({
  children,
  className,
  onClick,
}: ComposerProps): ReactElement => {
  const [isEmpty, setIsEmpty] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  const contextValue = useMemo(
    () => ({ setEmpty: setIsEmpty, setFocused: setIsFocused }),
    []
  );

  return (
    <ComposerContext.Provider value={contextValue}>
      <div
        className={cn(
          "relative flex flex-col gap-1 rounded-outer border border-border bg-surface",
          "focus-within:border-primary/60",
          "transition-[box-shadow,border-color] shadow-xs",
          "data-[disabled=true]:opacity-60 data-[disabled=true]:cursor-not-allowed",
          className
        )}
        data-empty={toFlag(isEmpty)}
        data-focus={toFlag(isFocused)}
        data-slot="composer"
        onClick={onClick}
        role="presentation"
      >
        {children}
      </div>
    </ComposerContext.Provider>
  );
};

export { Composer };
