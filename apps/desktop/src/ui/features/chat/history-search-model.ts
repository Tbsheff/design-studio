type HistoryKeyAction = "close" | "pick" | "previous" | "next" | null;

const toHistoryKeyAction = (
  key: string,
  isCtrl: boolean,
  hasCurrent: boolean
): HistoryKeyAction => {
  if (key === "Escape") {
    return "close";
  }

  if (key === "Enter" && hasCurrent) {
    return "pick";
  }

  if (key === "ArrowUp") {
    return "previous";
  }

  if (key === "ArrowDown" || (isCtrl && key === "r")) {
    return "next";
  }

  return null;
};

export { toHistoryKeyAction };

export type { HistoryKeyAction };
