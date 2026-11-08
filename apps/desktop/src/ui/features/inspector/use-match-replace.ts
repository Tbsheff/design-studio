import {
  matchesOf,
  replaceSummary,
  unlocatedCount,
} from "@design-studio/contracts/style-search";
import type { StyleHit } from "@design-studio/contracts/style-search";
import { useCallback } from "react";

import { errorText, replaceStyle } from "../../api.js";
import { NO_SOURCE_TEXT, toUnlocatedText } from "./match-model.js";
import type { InspectorMatchProps, Status } from "./match-scan-model.js";

const useMatchReplace = (
  props: InspectorMatchProps,
  setStatus: (status: Status) => void,
  refresh: () => void
): ((hits: StyleHit[], token: string) => Promise<void>) => {
  const { projectId, directionId, drain } = props;

  return useCallback(
    async (hits: StyleHit[], token: string): Promise<void> => {
      const matches = matchesOf(hits);

      if (matches.length === 0) {
        setStatus({ kind: "error", text: NO_SOURCE_TEXT });

        return;
      }

      setStatus({ kind: "busy", text: `Replacing ${matches.length} values…` });

      try {
        await drain();

        const result = await replaceStyle(projectId, directionId, {
          matches,
          token,
        });

        const extra = toUnlocatedText(unlocatedCount(hits));
        let kind: "done" | "error" = "error";

        if (result.replaced > 0) {
          kind = "done";
        }

        setStatus({ kind, text: `${replaceSummary(result, token)}${extra}.` });
        refresh();
      } catch (error) {
        setStatus({ kind: "error", text: errorText(error) });
      }
    },
    [directionId, drain, projectId, refresh, setStatus]
  );
};

export { useMatchReplace };
