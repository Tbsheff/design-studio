import type { DesignComment } from "./deps.js";

interface PanelGroups {
  readonly isEmpty: boolean;
  readonly orphaned: DesignComment[];
  readonly outside: DesignComment[];
  readonly resolved: DesignComment[];
  readonly sent: DesignComment[];
  readonly viewers: DesignComment[];
}

const toPanelGroups = (comments: DesignComment[]): PanelGroups => {
  const byStatus = (status: DesignComment["status"]): DesignComment[] =>
    comments.filter((comment) => comment.status === status);

  const fromOutside = comments.filter(
    (comment) =>
      comment.status === "draft" && comment.author && comment.from !== "viewer"
  );

  const fromViewers = comments.filter(
    (comment) => comment.status === "draft" && comment.from === "viewer"
  );

  const shown = comments.filter(
    (comment) => comment.status !== "draft" || comment.author
  );

  return {
    isEmpty: shown.length === 0,
    orphaned: byStatus("orphaned"),
    outside: fromOutside,
    resolved: byStatus("resolved"),
    sent: byStatus("sent"),
    viewers: fromViewers,
  };
};

const toResolvedCount = (isShown: boolean, total: number): number => {
  if (isShown) {
    return total;
  }

  return 0;
};

export { toPanelGroups, toResolvedCount };

export type { PanelGroups };
