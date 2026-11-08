import type { ReactElement } from "react";
import { useMemo } from "react";

import { AvatarFace } from "./comment-avatar.js";
import type { ComposerPlacement } from "./comment-placement.js";
import type { DesignComment } from "./deps.js";

const PopoverPin = ({
  comment,
  initial,
  pin,
  scale,
}: {
  comment: DesignComment;
  initial: string | null;
  pin: ComposerPlacement["pin"];
  scale: number;
}): ReactElement => {
  const style = useMemo(
    () => ({ left: pin.left, top: pin.top, transform: `scale(${scale})` }),
    [pin.left, pin.top, scale]
  );

  return (
    <div className="composer-pin" style={style} aria-hidden="true">
      <AvatarFace
        initial={initial}
        flip={pin.flip}
        tone={comment.status}
        count={comment.replies?.length ?? 0}
        author={comment.author}
      />
    </div>
  );
};

export { PopoverPin };
