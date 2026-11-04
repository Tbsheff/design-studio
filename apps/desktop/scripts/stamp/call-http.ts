import { parseText, timed, TOKEN_HEADER } from "./call-types.js";
import type { Context, Fields, Json, SurfaceResult } from "./call-types.js";

interface HttpRequest {
  readonly init: RequestInit;
  readonly url: string;
}

interface HttpReply {
  readonly isOk: boolean;
  readonly text: string;
}

const PARAM = /:(?<name>[A-Za-z_]\w*)/gu;

const QUERY_METHODS: ReadonlySet<string> = new Set(["DELETE", "GET"]);

const textOf = (value: Json): string => {
  if (value instanceof Object) {
    return JSON.stringify(value);
  }

  return String(value);
};

const pathNames = (route: string): Set<string> =>
  new Set(Array.from(route.matchAll(PARAM), (hit) => hit.groups?.name ?? ""));

const fillPath = (route: string, input: Fields): string =>
  route.replaceAll(PARAM, (_hit, name: string) =>
    encodeURIComponent(textOf(input[name] ?? null))
  );

const restOf = (route: string, input: Fields): Fields => {
  const used = pathNames(route);

  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !used.has(key))
  );
};

const withQuery = (url: string, rest: Fields): string => {
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

const requestOf = (context: Context): HttpRequest => {
  const { method, path: route } = context.action.http;
  const url = `${context.base}${fillPath(route, context.input)}`;
  const rest = restOf(route, context.input);
  const headers = { [TOKEN_HEADER]: context.token };

  if (QUERY_METHODS.has(method)) {
    return { init: { headers, method }, url: withQuery(url, rest) };
  }

  const init: RequestInit = {
    body: JSON.stringify(rest),
    headers: { ...headers, "content-type": "application/json" },
    method,
  };

  return { init, url };
};

const sendHttp = async (request: HttpRequest): Promise<HttpReply> => {
  const res = await fetch(request.url, request.init);
  const text = await res.text();

  return { isOk: res.ok, text };
};

const callHttp = async (context: Context): Promise<SurfaceResult> => {
  const request = requestOf(context);
  const timing = await timed(() => sendHttp(request));

  return {
    isError: !timing.value.isOk,
    ms: timing.ms,
    output: parseText(timing.value.text),
    spawns: null,
    surface: "http",
  };
};

export { callHttp };
