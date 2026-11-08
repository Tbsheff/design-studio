import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

const ComposerCheck = ({
  toClaude,
  onToClaude,
}: {
  toClaude: boolean;
  onToClaude: (isOn: boolean) => void;
}): ReactElement => {
  const changeCheck = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onToClaude(event.target.checked),
    [onToClaude]
  );

  return (
    <label className="comment-check">
      <input type="checkbox" checked={toClaude} onChange={changeCheck} />
      <span>{copy.textSendToClaude}</span>
    </label>
  );
};

export { ComposerCheck };
