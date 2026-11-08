const authorInitial = (author: string): string =>
  (author.trim()[0] ?? "?").toUpperCase();

export { authorInitial };
