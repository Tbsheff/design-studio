type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const FENCE = "```";

const fencedBody = (text: string): string => {
  const open = text.indexOf(FENCE);

  if (open === -1) {
    return text;
  }

  const close = text.indexOf(FENCE, open + FENCE.length);

  if (close === -1) {
    return text;
  }

  const inner = text.slice(open + FENCE.length, close);

  if (inner.startsWith("json")) {
    return inner.slice("json".length).trimStart();
  }

  return inner.trimStart();
};

const extractJson = (text: string): JsonValue => {
  const body = fencedBody(text);
  const start = body.search(/[[{]/u);

  if (start === -1) {
    throw new Error("no JSON in critic reply");
  }

  const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));

  return JSON.parse(body.slice(start, end + 1));
};

export { extractJson };

export type { JsonValue };
