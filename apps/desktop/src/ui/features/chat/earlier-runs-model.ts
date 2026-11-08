const toEarlierLabel = (hidden: number, isLoading: boolean): string => {
  if (hidden > 1) {
    return `Show ${hidden} earlier runs`;
  }

  if (hidden === 1) {
    return "Show 1 earlier run";
  }

  if (isLoading) {
    return "Loading earlier runs";
  }

  return "Show earlier runs";
};

export { toEarlierLabel };
