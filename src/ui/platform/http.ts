import { tokenHeaders } from "./session";

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

type WireJson =
  | boolean
  | number
  | string
  | null
  | readonly WireJson[]
  | { readonly [key: string]: WireJson };

type WireFields = Readonly<Record<string, WireJson>>;

interface HttpOp<In extends WireFields = WireFields, Out = WireJson> {
  readonly input?: In;
  readonly method: HttpMethod;
  readonly output?: Out;
  readonly path: string;
}

type WireInput<Op> = Op extends HttpOp<infer In> ? In : never;

type WireOutput<Op> = Op extends HttpOp<WireFields, infer Out> ? Out : never;

interface WireError {
  readonly code?: string;
  readonly error?: string;
  readonly message?: string;
}

const PARAM = /:(?<name>[A-Za-z_]\w*)/gu;

const QUERY_METHODS = new Set<HttpMethod>(["DELETE", "GET"]);

class ApiError extends Error {
  declare public readonly code?: string;

  declare public readonly data?: WireFields;

  declare public readonly status: number;

  declare public readonly tag: string;

  public constructor(
    status: number,
    message: string,
    code?: string,
    body?: WireFields
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = body;
    this.tag = String(body?.["_tag"] ?? code ?? status);
  }
}

const textOf = (value: WireJson): string => {
  if (value instanceof Object) {
    return JSON.stringify(value);
  }

  return String(value);
};

const pathNames = (path: string): Set<string> =>
  new Set(Array.from(path.matchAll(PARAM), (hit) => hit.groups?.name ?? ""));

const fillPath = (path: string, fields: WireFields): string =>
  path.replaceAll(PARAM, (_hit, name: string) =>
    encodeURIComponent(textOf(fields[name] ?? null))
  );

const restOf = (path: string, fields: WireFields): WireFields => {
  const used = pathNames(path);

  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => !used.has(key))
  );
};

const withQuery = (url: string, rest: WireFields): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(rest)) {
    query.append(key, textOf(value));
  }

  const text = query.toString();

  if (text === "") {
    return url;
  }

  return `${url}?${text}`;
};

const readError = async (
  res: Response,
  fallback: string
): Promise<ApiError> => {
  try {
    const body = (await res.json()) as WireFields & WireError;

    return new ApiError(
      res.status,
      body.message ?? body.error ?? fallback,
      body.error,
      body
    );
  } catch {
    return new ApiError(res.status, `${fallback} ${res.statusText}`);
  }
};

const requestOf = (method: HttpMethod, rest: WireFields): RequestInit => {
  const headers = tokenHeaders();

  if (QUERY_METHODS.has(method)) {
    return { headers, method };
  }

  return {
    body: JSON.stringify(rest),
    headers: { ...headers, "content-type": "application/json" },
    method,
  };
};

const targetOf = (op: HttpOp, fields: WireFields): string => {
  const url = fillPath(op.path, fields);

  if (QUERY_METHODS.has(op.method)) {
    return withQuery(url, restOf(op.path, fields));
  }

  return url;
};

const call = async <Op extends HttpOp>(
  op: Op,
  input: WireInput<Op>
): Promise<WireOutput<Op>> => {
  const fields: WireFields = input;
  const target = targetOf(op, fields);

  const res = await fetch(
    target,
    requestOf(op.method, restOf(op.path, fields))
  );

  if (!res.ok) {
    throw await readError(
      res,
      `${op.method} ${target} failed: ${String(res.status)}`
    );
  }

  return (await res.json()) as WireOutput<Op>;
};

export { ApiError, call };

export type { HttpMethod, HttpOp, WireFields, WireInput, WireJson, WireOutput };
