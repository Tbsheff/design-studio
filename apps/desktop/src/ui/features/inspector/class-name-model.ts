type ClassPart = string | false | null;

const toClassName = (...parts: readonly ClassPart[]): string =>
  parts
    .filter((part): part is string => part !== false && part !== null)
    .join(" ");

export { toClassName };

export type { ClassPart };
