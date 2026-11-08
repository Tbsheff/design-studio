import type { DesignComment } from "./deps.js";

const toMerged = (
  prev: DesignComment[],
  comment: DesignComment
): DesignComment[] => {
  if (prev.some((item) => item.id === comment.id)) {
    return prev.map((item) => {
      if (item.id === comment.id) {
        return comment;
      }

      return item;
    });
  }

  return [...prev, comment];
};

export { toMerged };
