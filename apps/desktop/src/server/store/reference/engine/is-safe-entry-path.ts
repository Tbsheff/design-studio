const BACKSLASH = "\\";

const isSafeEntryPath = (entryPath: string): boolean => {
  if (entryPath === "" || entryPath.includes(BACKSLASH)) {
    return false;
  }

  if (entryPath.startsWith("/") || entryPath.includes("\0")) {
    return false;
  }

  return entryPath
    .split("/")
    .every((part) => part !== ".." && part !== "." && part !== "");
};

export { isSafeEntryPath };
