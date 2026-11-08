import { useCallback, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { PictureButton } from "./picture-button.js";

const NO_STYLE: CSSProperties = {};

interface PicturePickerProps {
  readonly isCompact: boolean;
  readonly onPick: (file: File | null) => void;
  readonly size: { readonly width: number; readonly height: number } | null;
}

const PicturePicker = ({
  isCompact,
  onPick,
  size,
}: PicturePickerProps): ReactNode => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsOver(true);
    },
    []
  );

  const handleDragLeave = useCallback((): void => {
    setIsOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsOver(false);
      onPick(event.dataTransfer.files[0] ?? null);
    },
    [onPick]
  );

  if (isCompact) {
    return <PictureButton isCompact onPick={onPick} />;
  }

  let className = "compare-ref-empty ";

  if (isOver) {
    className = "compare-ref-empty over";
  }

  return (
    <div
      className={className}
      style={size ?? NO_STYLE}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span>{COPY.pictureDrop}</span>
      <PictureButton isCompact={false} onPick={onPick} />
    </div>
  );
};

export { PicturePicker };
