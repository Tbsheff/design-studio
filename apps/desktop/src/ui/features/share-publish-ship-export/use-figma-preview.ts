import type {
  FigmaImportPreview,
  FigmaImportRequest,
  FigmaImportSource,
} from "@design-studio/contracts/figma-nodes";
import type {
  InsertTarget,
  JsxInsertPosition,
} from "@design-studio/contracts/insert";
import { useCallback, useEffect, useState } from "react";

import { json } from "../../api.js";
import { toFailureMessage } from "./figma-failure-message.js";
import { toRoute } from "./figma-import-model.js";

interface FigmaPreviewIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface FigmaPreviewInput {
  readonly base: FigmaImportSource;
  readonly ids: FigmaPreviewIds;
  readonly nodeId: string;
  readonly position: JsxInsertPosition;
  readonly target: InsertTarget;
}

interface FigmaPreviewState {
  readonly doneKey: string;
  readonly failure: string | null;
  readonly preview: FigmaImportPreview | null;
}

interface FigmaPreview {
  readonly failure: string | null;
  readonly isLoading: boolean;
  readonly preview: FigmaImportPreview | null;
  readonly setFailure: (failure: string | null) => void;
}

const toPreviewBody = (input: FigmaPreviewInput): FigmaImportRequest => {
  const { base, nodeId, position, target } = input;
  const body: FigmaImportRequest = { ...base, dryRun: true, position, target };

  if (nodeId) {
    body.nodeId = nodeId;
  }

  return body;
};

const useFigmaPreview = (input: FigmaPreviewInput): FigmaPreview => {
  const { base, ids, nodeId, position, target } = input;
  const key = JSON.stringify({ base, ids, nodeId, position, target });

  const [state, setState] = useState<FigmaPreviewState>({
    doneKey: "",
    failure: null,
    preview: null,
  });

  useEffect(() => {
    let isLive = true;

    const load = async (): Promise<void> => {
      try {
        const preview = await json<FigmaImportPreview>(
          "POST",
          toRoute(ids),
          toPreviewBody({ base, ids, nodeId, position, target })
        );

        if (isLive) {
          setState({ doneKey: key, failure: null, preview });
        }
      } catch (error) {
        if (isLive) {
          const failure = toFailureMessage(error as Error);
          setState((previous) => ({ ...previous, doneKey: key, failure }));
        }
      }
    };

    void load();

    return (): void => {
      isLive = false;
    };
  }, [base, ids, key, nodeId, position, target]);

  const setFailure = useCallback((failure: string | null): void => {
    setState((previous) => ({ ...previous, failure }));
  }, []);

  return {
    failure: state.failure,
    isLoading: state.doneKey !== key,
    preview: state.preview,
    setFailure,
  };
};

export { useFigmaPreview };

export type { FigmaPreview, FigmaPreviewIds };
