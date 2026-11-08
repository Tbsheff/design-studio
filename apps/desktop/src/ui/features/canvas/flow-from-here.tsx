import { Icon } from "@design-studio/ui";
import { useCallback, useState, useTransition } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";

import type { FlowResult } from "../../../shared/route-flow.js";
import { api, errorText } from "../../api.js";
import { useCurrentFrameStates } from "./frame-states-model.js";

const stop = (event: ReactPointerEvent): void => event.stopPropagation();

const doneText = (result: FlowResult): string => {
  const added = result.frames.filter((frame) => frame.added).length;

  if (added === 0 && result.links.length === 0) {
    return "No new routes or links found in the source of this route.";
  }

  let missing = "";

  if (result.missingParams.length > 0) {
    missing = ` Set ${result.missingParams.join(", ")} in App > Flow.`;
  }

  let part: "route" | "routes" = "routes";

  if (added === 1) {
    part = "route";
  }

  let part3: "link" | "links" = "links";

  if (result.links.length === 1) {
    part3 = "link";
  }

  return `Added ${added} ${part} and ${result.links.length} ${part3}.${missing}`;
};

const FlowFromHere = ({
  frameId,
  frameName,
}: {
  frameId: string;
  frameName: string;
}): ReactElement | null => {
  const states = useCurrentFrameStates();
  const [busy, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const clearNote = useCallback(() => setNote(null), []);
  const projectId = states?.projectId ?? null;

  const run = useCallback((): void => {
    if (projectId === null) {
      return;
    }

    setNote(null);

    startTransition(async () => {
      try {
        const result = await api.buildFlow(projectId, {
          depth: 1,
          from: frameId,
        });

        setNote(doneText(result));
      } catch (error: unknown) {
        setNote(errorText(error));
      }
    });
  }, [projectId, frameId]);

  if (!states) {
    return null;
  }

  let part2: "" | " busy" = "";

  if (busy) {
    part2 = " busy";
  }

  let part4: "" | " done" = "";

  if (note) {
    part4 = " done";
  }

  let content: ReactNode = <Icon name="branch" size={12} />;

  if (busy) {
    content = <span className="spinner" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className={`frame-chip flow${part2}${part4}`}
      aria-label={`Flow from ${frameName}`}
      aria-busy={busy}
      disabled={busy}
      onPointerDown={stop}
      onClick={run}
      onBlur={clearNote}
      data-tip={
        note ??
        "Flow from here: add the routes this page links to, with prototype links"
      }
    >
      {content}
      {note && <output className="sr-only">{note}</output>}
    </button>
  );
};

export { FlowFromHere };
