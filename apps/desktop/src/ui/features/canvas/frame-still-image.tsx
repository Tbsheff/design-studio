import type { ReactElement } from "react";

const FrameStillImage = ({
  url,
}: {
  readonly url: string | null;
}): ReactElement | null => {
  if (!url) {
    return null;
  }

  return (
    <img
      className="frame-still"
      src={url}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
};

export { FrameStillImage };
