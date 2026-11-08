const toPlural = (count: number): string => {
  if (count === 1) {
    return "";
  }

  return "s";
};

export { toPlural };
