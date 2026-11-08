import type {
  SelectionContext,
  TextSourceAnswer,
  TextSourceHints,
  SourceLoc,
} from "@design-studio/contracts";
import { startTransition, useEffect, useState } from "react";

import { api } from "../../api.js";
import type { TextEditScope } from "./inspector-shared-model.js";
import { textHints } from "./use-direct-edit.js";
import { useStableValue } from "./use-stable-value.js";

interface TextSourceRequest {
  readonly projectId: string;
  readonly directionId: string;
  readonly source: SourceLoc;
  readonly hints: TextSourceHints;
}

const toTextSourceRequest = (
  edit: TextEditScope,
  selection: SelectionContext
): TextSourceRequest | null => {
  const { projectId, directionId } = edit.scope;
  const { source } = selection;

  if (!directionId || !source) {
    return null;
  }

  const hints = textHints(selection);

  return { directionId, hints, projectId, source };
};

const toRequestKey = (
  edit: TextEditScope,
  selection: SelectionContext
): string => {
  let savedAt = 0;

  if (edit.status.kind === "saved") {
    savedAt = edit.status.at;
  }

  return JSON.stringify([
    edit.scope.projectId,
    edit.scope.directionId,
    selection.source,
    selection.text,
    selection.usedAt ?? null,
    selection.owners?.map((owner) => owner.stack) ?? [],
    savedAt,
  ]);
};

const useTextSource = (
  edit: TextEditScope,
  selection: SelectionContext
): TextSourceAnswer | null => {
  const [answer, setAnswer] = useState<TextSourceAnswer | null>(null);

  const request = useStableValue(
    toTextSourceRequest(edit, selection),
    toRequestKey(edit, selection)
  );

  useEffect(() => {
    if (!request) {
      return;
    }

    let isLive = true;

    startTransition(async () => {
      try {
        const next = await api.textSource(
          request.projectId,
          request.directionId,
          request.source,
          request.hints
        );

        if (isLive) {
          setAnswer(next);
        }
      } catch {
        if (isLive) {
          setAnswer({ reason: "" });
        }
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [request]);

  if (!request) {
    return null;
  }

  return answer;
};

export { useTextSource };
