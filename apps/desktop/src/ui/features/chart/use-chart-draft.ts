import { useReducer } from "react";
import type { Dispatch } from "react";

import { toDraftAfter } from "./chart-draft-model.js";
import type { DraftAction } from "./chart-draft-model.js";
import { toDefaultDraft } from "./chart-model.js";
import type { ChartDraft } from "./chart-model.js";

interface DraftState {
  readonly dispatch: Dispatch<DraftAction>;
  readonly draft: ChartDraft;
}

const useChartDraft = (): DraftState => {
  const [draft, dispatch] = useReducer(toDraftAfter, "bar", toDefaultDraft);

  return { dispatch, draft };
};

export { useChartDraft };

export type { DraftState };
