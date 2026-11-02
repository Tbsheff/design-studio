const BEARER_PREFIX = "Bearer ";

const KEY_PREFIX = "ds_mcp_";

const toBearer = (request: Request): string | null => {
  const header = request.headers.get("authorization");

  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  if (token.length === 0) {
    return null;
  }

  return token;
};

const isApiKey = (token: string): boolean => token.startsWith(KEY_PREFIX);

export { KEY_PREFIX, isApiKey, toBearer };
