import type { ReactElement } from "react";

import { authorInitial } from "./author-initial.js";
import { Icon } from "./deps.js";

const COUNT_MAX = 9;

interface AvatarProps {
  initial: string | null;
  flip?: boolean;
  tone?: string;
  count?: number;
  author?: string | undefined;
}

const toFace = (
  initial: string | null,
  author: string | undefined
): string | null => {
  if (author) {
    return authorInitial(author);
  }

  return initial;
};

const toSuffix = (isOn: boolean, text: string): string => {
  if (isOn) {
    return text;
  }

  return "";
};

const toCountLabel = (count: number): string | number => {
  if (count > COUNT_MAX) {
    return `${COUNT_MAX}+`;
  }

  return count;
};

const AvatarFace = ({
  initial,
  flip = false,
  tone = "queued",
  count = 0,
  author,
}: AvatarProps): ReactElement => {
  const face = toFace(initial, author);

  return (
    <span
      className={`avatar-pin ${tone}${toSuffix(flip, " flip")}${toSuffix(Boolean(author), " agent")}`}
      aria-hidden="true"
    >
      <span className="avatar-face">
        {face ?? <Icon name="comment" size={12} />}
      </span>
      {count > 0 && <span className="avatar-count">{toCountLabel(count)}</span>}
    </span>
  );
};

export { AvatarFace };
