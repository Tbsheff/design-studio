import { useMemo } from "react";
import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { AvatarFace } from "./comment-avatar.js";
import type { ComposerPlacement } from "./comment-placement.js";

const ComposerPin = ({
  initial,
  placement,
  scale,
  isClosing,
}: {
  initial: string | null;
  placement: ComposerPlacement;
  scale: number;
  isClosing: boolean;
}): ReactElement => {
  const { left, top } = placement.pin;

  const style = useMemo(
    () => ({ left, top, transform: `scale(${scale})` }),
    [left, scale, top]
  );

  return (
    <div
      className={toChoice(isClosing, "composer-pin closing", "composer-pin")}
      style={style}
      aria-hidden="true"
    >
      <AvatarFace initial={initial} flip={placement.pin.flip} />
    </div>
  );
};

export { ComposerPin };
