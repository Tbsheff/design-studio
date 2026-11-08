import type { DesignComment, RunRequest } from "@design-studio/contracts";

import type { RunView } from "./run-state-model.js";

type LinkState = "done" | "resolved" | "open";

const STATE_TIP: Record<LinkState, string> = {
  done: "The agent says it did this",
  open: "Still open",
  resolved: "Resolved",
};

const idsOf = (request: RunRequest | null | undefined): string[] => {
  if (!request) {
    return [];
  }

  return [
    ...(request.comments ?? []).map((comment) => comment.id),
    ...(request.commentIds ?? []),
  ];
};

const replyText = (run: RunView): string => {
  if (run.summary?.finalText) {
    return run.summary.finalText;
  }

  return run.parts
    .flatMap((part) => {
      if (part.kind === "text") {
        return [part.text];
      }

      return [];
    })
    .join("\n");
};

const stateOf = (comment: DesignComment, done: number[] | null): LinkState => {
  if (comment.status === "resolved") {
    return "resolved";
  }

  if (done?.includes(comment.n)) {
    return "done";
  }

  return "open";
};

const resolvable = (
  linked: DesignComment[],
  done: number[] | null
): DesignComment[] => {
  const open = linked.filter(
    (comment) => comment.status !== "resolved" && comment.status !== "sent"
  );

  if (done === null) {
    return open;
  }

  const doneSet = new Set(done);

  return open.filter((comment) => doneSet.has(comment.n));
};

const toNoun = (count: number): "comment" | "comments" => {
  if (count === 1) {
    return "comment";
  }

  return "comments";
};

export { STATE_TIP, idsOf, replyText, resolvable, stateOf, toNoun };

export type { LinkState };
