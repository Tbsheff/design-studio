const toClassName = (base: string, extra: string | null): string =>
  [base, extra ?? ""].join(" ").trim();

export { toClassName };
