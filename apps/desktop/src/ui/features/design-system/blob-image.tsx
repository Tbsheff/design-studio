import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

const BOX_SIZE = 128;

const BlobImage = ({ blob }: { blob: Blob }): ReactElement => {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = ref.current;

    if (!image) {
      return;
    }

    const url = URL.createObjectURL(blob);
    image.src = url;

    return (): void => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <img
      ref={ref}
      alt=""
      width={BOX_SIZE}
      height={BOX_SIZE}
      draggable={false}
    />
  );
};

export { BlobImage };
