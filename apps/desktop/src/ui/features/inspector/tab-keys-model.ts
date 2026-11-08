const toTabKeyTarget = (
  key: string,
  at: number,
  count: number
): number | null => {
  if (key === "ArrowLeft") {
    return at - 1;
  }

  if (key === "ArrowRight") {
    return at + 1;
  }

  if (key === "End") {
    return count - 1;
  }

  if (key === "Home") {
    return 0;
  }

  return null;
};

export { toTabKeyTarget };
