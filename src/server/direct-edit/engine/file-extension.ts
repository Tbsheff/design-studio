const EXTENSION = /\.[^./\\]+$/u;

export const fileExtension = (relative: string): string =>
  EXTENSION.exec(relative)?.[0]?.toLowerCase() ?? "";
