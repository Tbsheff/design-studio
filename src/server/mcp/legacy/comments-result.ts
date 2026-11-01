import type { DesignComment } from "../../../shared/contracts.js";

interface AddedResult {
  author: string;
  commentId: string;
  frameLevel: boolean;
  number: number;
}

const addedResult = (
  comment: DesignComment,
  client: string,
  onFrame: boolean
): AddedResult => ({
  commentId: comment.id,
  number: comment.n,
  frameLevel: onFrame,
  author: comment.author ?? client,
});

export { addedResult };
