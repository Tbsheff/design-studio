import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";

import type { FlowResult } from "../../../shared/route-flow.js";
import { api, errorText } from "../../api.js";
import { useCurrentFrameStates } from "./frame-states-model.js";

import "../../styles/route-flow.css";

const ADDED_0 = 0;

const LENGTH_0 = 0;

const ADDED_1 = 1;

const LENGTH_1 = 1;

const stop = (event: ReactPointerEvent): void => event.stopPropagation();

const doneText = (result: FlowResult): string => {
  const added = result.frames.filter((frame) => frame.added).length;

  if (added === ADDED_0 && result.links.length === LENGTH_0) {
    return "No new routes or links found in the source of this route.";
  }

  let missing = "";

  if (result.missingParams.length > LENGTH_0) {
    missing = ` Set ${result.missingParams.join(", ")} in App > Flow.`;
  }

  let part: "route" | "routes" = "routes";

  if (added === ADDED_1) {
    part = "route";
  }

  let part3: "link" | "links" = "links";

  if (result.links.length === LENGTH_1) {
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
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!states) {
    return null;
  }

  const run = async (): Promise<void> => {
    setBusy(true);
    setNote(null);

    try {
      const result = await api.buildFlow(states.projectId, {
        depth: 1,
        from: frameId,
      });

      setNote(doneText(result));
    } catch (error: unknown) {
      setNote(errorText(error));
    } finally {
      setBusy(false);
    }
  };

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
      onBlur={() => setNote(null)}
      data-tip={
        note ??
        "Flow from here: add the routes this page links to, with prototype links"
      }
    >
      {content}
      {note && (
        <span className="sr-only" role="status">
          {note}
        </span>
      )}
    </button>
  );
};

export { FlowFromHere };
