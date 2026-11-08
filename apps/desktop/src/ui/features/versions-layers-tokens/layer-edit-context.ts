import type { RefObject } from "react";

import type { LayerEditsOptions } from "./layer-edits-types.js";
import type { EditBusy } from "./use-edit-busy.js";
import type { ReselectApi } from "./use-reselect.js";

interface EditContext {
  readonly busy: EditBusy;
  readonly liveRef: RefObject<LayerEditsOptions>;
  readonly notify: (message: string) => void;
  readonly reselect: ReselectApi;
}

export type { EditContext };
