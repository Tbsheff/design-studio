const INDEX_FILE = "index.html";

const MAX_PATH = 512;

const SEGMENT_PATTERN = /^[A-Za-z0-9._~@%+=,-]{1,128}$/u;

const toPublishedPath = (raw: string): string | null => {
  const trimmed = raw.replace(/^\/+/u, "");

  if (trimmed.length > MAX_PATH) {
    return null;
  }

  if (trimmed === "") {
    return INDEX_FILE;
  }

  let withIndex = trimmed;

  if (trimmed.endsWith("/")) {
    withIndex = `${trimmed}${INDEX_FILE}`;
  }

  const segments = withIndex.split("/");

  for (const segment of segments) {
    if (segment === "." || segment === ".." || !SEGMENT_PATTERN.test(segment)) {
      return null;
    }
  }

  return withIndex;
};

export { toPublishedPath };
