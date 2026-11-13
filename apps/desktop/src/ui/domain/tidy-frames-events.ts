import type { WireInput } from "@design-studio/actions/_core/action";
import type { moveFramesCanvas } from "@design-studio/actions/canvas/move-frames";

const TIDY_FRAMES_EVENT = "studio:tidy-frames";

type TidyFramesLayout = WireInput<typeof moveFramesCanvas>["layout"];

interface TidyFramesDetail {
  readonly frameId: string | null;
  readonly layout: TidyFramesLayout | null;
}

export { TIDY_FRAMES_EVENT };

export type { TidyFramesDetail, TidyFramesLayout };
