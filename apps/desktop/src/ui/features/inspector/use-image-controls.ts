import { startTransition, useCallback, useState } from "react";

import { imageKindOf } from "../../../shared/image.js";
import type { ImageFit } from "../../../shared/image.js";
import { runCommand } from "../../inspector-slots.js";
import { getCurrentFit, toInitialFocal } from "./image-model.js";
import type { Props } from "./image-model.js";
import { useImageClipboard } from "./use-image-clipboard.js";
import { useImageSet } from "./use-image-set.js";
import { usePasteImage } from "./use-paste-image.js";

interface ImageControls {
  readonly alt: string | null;
  readonly error: string | null;
  readonly fit: ImageFit | null;
  readonly focal: string;
  readonly isBackground: boolean;
  readonly isBusy: boolean;
  readonly kind: ReturnType<typeof imageKindOf>;
  readonly placed: string | null;
  readonly handleAlt: (next: string) => void;
  readonly handleFile: (file: Blob) => void;
  readonly handleFind: () => void;
  readonly handleFit: (option: ImageFit) => void;
  readonly handleFocal: (next: string) => void;
  readonly handlePaste: () => void;
}

const useImageControls = (props: Props): ImageControls => {
  const kind = imageKindOf(props.selection);
  const isBackground = kind === "background";
  const image = useImageSet(props);
  const { error, isBusy, placed, run, setError } = image;
  const [alt, setAlt] = useState<string | null>(null);

  const [fit, setFit] = useState<ImageFit | null>(() =>
    getCurrentFit(props.selection, isBackground)
  );

  const [focal, setFocal] = useState(() =>
    toInitialFocal(props.selection, isBackground)
  );

  const handleFile = useCallback(
    (file: Blob): void => {
      startTransition(async () => {
        await run({}, file);
      });
    },
    [run]
  );

  usePasteImage(props.isEditable && kind !== null, handleFile);

  const handlePaste = useImageClipboard(run, setError);

  const handleFind = useCallback((): void => {
    runCommand("image.find");
  }, []);

  const handleFit = useCallback(
    (option: ImageFit): void => {
      setFit(option);
      startTransition(async () => {
        await run({ fit: option });
      });
    },
    [run]
  );

  const handleFocal = useCallback(
    (next: string): void => {
      setFocal(next);
      startTransition(async () => {
        await run({ focal: next });
      });
    },
    [run]
  );

  const handleAlt = useCallback(
    (next: string): void => {
      setAlt(next);
      startTransition(async () => {
        await run({ alt: next });
      });
    },
    [run]
  );

  return {
    alt,
    error,
    fit,
    focal,
    handleAlt,
    handleFile,
    handleFind,
    handleFit,
    handleFocal,
    handlePaste,
    isBackground,
    isBusy,
    kind,
    placed,
  };
};

export { useImageControls };

export type { ImageControls };
