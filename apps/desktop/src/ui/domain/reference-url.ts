const MAX_REFERENCE_URL_LENGTH = 2000;

const toReferenceUrl = (raw: string): URL | null => {
  const text = raw.trim();

  if (text === "" || text.length > MAX_REFERENCE_URL_LENGTH) {
    return null;
  }

  try {
    return new URL(text);
  } catch {
    return null;
  }
};

const getReferenceUrlProblem = (raw: string): string | null => {
  const url = toReferenceUrl(raw);

  if (url === null) {
    return "Enter a full web address, such as https://example.com.";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Use an http or https address.";
  }

  return null;
};

const toReferenceUrlLabel = (raw: string): string =>
  toReferenceUrl(raw)?.host ?? raw.trim();

export { getReferenceUrlProblem, toReferenceUrlLabel };
