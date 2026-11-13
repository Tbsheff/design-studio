import type { SharePlayData } from "@design-studio/contracts/share-play";
import { useCallback, useMemo, useState } from "react";

import {
  isPhoneViewer,
  toFrameUrl,
  toInitialMode,
  toLinksFile,
  toStartId,
  toViewerFrames,
} from "./share-viewer-model.js";
import type {
  PinSpot,
  SharePlayInput,
  ViewerFrame,
  ViewMode,
} from "./share-viewer-model.js";

interface ShareViewerState {
  readonly draft: PinSpot | null;
  readonly frames: ViewerFrame[];
  readonly isCommentsOpen: boolean;
  readonly mode: ViewMode;
  readonly play: SharePlayInput;
  readonly selected: number;
  readonly onCanvas: () => void;
  readonly onClearDraft: () => void;
  readonly onComments: () => void;
  readonly onPick: (spot: PinSpot) => void;
  readonly onPlay: () => void;
}

const toUrl = (frame: ViewerFrame): Promise<string | null> =>
  Promise.resolve(toFrameUrl(frame));

const toPlayStart = (
  frames: readonly ViewerFrame[],
  selected: number,
  fallback: string
): string => frames[selected]?.id ?? fallback;

const useShareViewer = (data: SharePlayData): ShareViewerState => {
  const frames = useMemo(() => toViewerFrames(data), [data]);
  const file = useMemo(() => toLinksFile(data), [data]);
  const startId = useMemo(() => toStartId(file, frames), [file, frames]);
  const [mode, setMode] = useState<ViewMode>(toInitialMode);
  const [selected, setSelected] = useState(-1);
  const [draft, setDraft] = useState<PinSpot | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(() => !isPhoneViewer());

  const onCanvas = useCallback((): void => setMode("canvas"), []);
  const onPlay = useCallback((): void => setMode("play"), []);
  const onClearDraft = useCallback((): void => setDraft(null), []);

  const onComments = useCallback(
    (): void => setIsCommentsOpen((isOpen) => !isOpen),
    []
  );

  const onPick = useCallback(
    (spot: PinSpot): void => {
      setSelected(spot.frame);

      if (isCommentsOpen) {
        setDraft(spot);
      }
    },
    [isCommentsOpen]
  );

  const play = useMemo(
    (): SharePlayInput => ({
      file,
      frames,
      isFullBleed: isPhoneViewer(),
      onClose: onCanvas,
      startId: toPlayStart(frames, selected, startId),
      urlOf: toUrl,
    }),
    [file, frames, onCanvas, selected, startId]
  );

  return {
    draft,
    frames,
    isCommentsOpen,
    mode,
    onCanvas,
    onClearDraft,
    onComments,
    onPick,
    onPlay,
    play,
    selected,
  };
};

export { useShareViewer };

export type { ShareViewerState };
