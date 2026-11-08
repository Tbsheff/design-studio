import type { ReactElement } from "react";

const ComponentsNotice = ({
  text,
}: {
  text: string | null;
}): ReactElement | null => {
  if (text === null) {
    return null;
  }

  return <p className="ins-empty cmp-empty">{text}</p>;
};

export { ComponentsNotice };
