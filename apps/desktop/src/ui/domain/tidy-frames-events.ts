const TIDY_FRAMES_EVENT = "studio:tidy-frames";

interface TidyFramesDetail {
  readonly frameId: string | null;
}

export { TIDY_FRAMES_EVENT };

export type { TidyFramesDetail };
