import type { ReactNode } from "react";

const MarkedSegment = ({
  isMarked,
  text,
}: {
  isMarked: boolean;
  text: string;
}): ReactNode => {
  if (isMarked) {
    return <mark>{text}</mark>;
  }

  return text;
};

export { MarkedSegment };
