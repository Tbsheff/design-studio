import type { DesignComment } from "./deps.js";

const toRepliesLabel = (count: number): string => {
  if (count === 0) {
    return "";
  }

  if (count === 1) {
    return ", 1 reply";
  }

  return `, ${count} replies`;
};

const toAuthorLabel = (author: string | undefined): string => {
  if (author) {
    return ` by ${author}`;
  }

  return "";
};

const toPinLabel = (comment: DesignComment, replies: number): string => {
  const author = toAuthorLabel(comment.author);

  return `Comment ${comment.n}${author}${toRepliesLabel(replies)}: ${comment.text}`;
};

const toPinClass = (comment: DesignComment, isPicked: boolean): string => {
  const classes = ["comment-pin", comment.status];

  if (comment.drawing) {
    classes.push("has-drawing");
  }

  if (isPicked) {
    classes.push("picked");
  }

  return classes.join(" ");
};

const toWrapClass = (isFlipped: boolean): string => {
  if (isFlipped) {
    return "comment-pin-wrap flip";
  }

  return "comment-pin-wrap";
};

export { toPinClass, toPinLabel, toWrapClass };
