import type {
  ActionId,
  AnyAction,
  Method,
  WireInput,
  WireOutput,
} from "../../shared/actions/_core/action.js";
import type { WireBody } from "../../shared/actions/_core/wire.js";
import { tokenHeaders } from "./session";

type HttpMethod = Method;

type WireJson =
  | boolean
  | number
  | string
  | null
  | readonly WireJson[]
  | { readonly [key: string]: WireJson };

type WireFields = Readonly<Record<string, WireJson>>;

interface ActionRoute {
  readonly id: ActionId;
  readonly invalidates: readonly ActionId[];
  readonly method: HttpMethod;
  readonly path: string;
}

type RouteOf<Action extends AnyAction> = ActionRoute & {
  readonly id: Action["id"];
};

type WireError = Partial<WireBody>;

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
      body.code ?? body.error,
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

const targetOf = (route: ActionRoute, fields: WireFields): string => {
  const url = fillPath(route.path, fields);

  if (QUERY_METHODS.has(route.method)) {
    return withQuery(url, restOf(route.path, fields));
  }

  return url;
};

const call = async <Action extends AnyAction>(
  route: RouteOf<Action>,
  input: WireInput<Action>
): Promise<WireOutput<Action>> => {
  const fields = input as WireFields;
  const target = targetOf(route, fields);

  const res = await fetch(
    target,
    requestOf(route.method, restOf(route.path, fields))
  );

  if (!res.ok) {
    throw await readError(
      res,
      `${route.method} ${target} failed: ${String(res.status)}`
    );
  }

  return (await res.json()) as WireOutput<Action>;
};

const getRaw = (path: string, signal?: AbortSignal): Promise<Response> =>
  fetch(path, { headers: tokenHeaders(), signal });

const getJson = async <Body>(path: string): Promise<Body | null> => {
  const res = await getRaw(path);

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as Body;
};

const getBlob = async (path: string): Promise<Blob | null> => {
  const res = await getRaw(path);

  if (!res.ok) {
    return null;
  }

  return res.blob();
};

const readBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new ApiError(res.status, `GET ${url} failed`);
  }

  return res.blob();
};

export { ApiError, call, getBlob, getJson, getRaw, readBlob };

export type { ActionRoute, HttpMethod, RouteOf, WireFields, WireJson };
