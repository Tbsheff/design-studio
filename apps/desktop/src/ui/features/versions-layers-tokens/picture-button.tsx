import { useCallback, useRef } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

interface PictureButtonProps {
  readonly isCompact: boolean;
  readonly onPick: (file: File | null) => void;
}

const PictureButton = ({
  isCompact,
  onPick,
}: PictureButtonProps): ReactNode => {
  const input = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onPick(event.target.files?.[0] ?? null);
      event.target.value = "";
    },
    [onPick]
  );

  const handleChooseClick = useCallback((): void => {
    input.current?.click();
  }, []);

  let label: string = COPY.pictureChoose;

  if (isCompact) {
    label = COPY.pictureChange;
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={handleFileChange}
        data-testid="compare-ref-input"
      />
      <button type="button" className="btn small" onClick={handleChooseClick}>
        {label}
      </button>
    </>
  );
};

export { PictureButton };
