type Json =
  | boolean
  | number
  | string
  | null
  | readonly Json[]
  | { readonly [key: string]: Json };

type Fields = Readonly<Record<string, Json>>;

type Surface = "agent" | "http" | "mcp";

interface Binding {
  readonly name?: string;
  readonly off?: string;
}

interface HttpBinding {
  readonly method: string;
  readonly path: string;
}

interface CallableAction {
  readonly access: string;
  readonly agent: Binding;
  readonly confirm: string;
  readonly http: HttpBinding;
  readonly id: string;
  readonly mcp: Binding;
}

interface Outcome {
  readonly isError: boolean;
  readonly ms: number;
  readonly output: Json;
  readonly spawns: number | null;
  readonly surface: Surface;
}

interface Skip {
  readonly reason: string;
  readonly surface: Surface;
}

interface Broken {
  readonly error: string;
  readonly surface: Surface;
}

type SurfaceResult = Broken | Outcome | Skip;

interface Context {
  readonly action: CallableAction;
  readonly base: string;
  readonly input: Fields;
  readonly token: string;
}

interface TextPart {
  readonly text?: string;
}

interface TextResult {
  readonly content: readonly TextPart[];
  readonly isError?: boolean;
}

interface Timed<Value> {
  readonly ms: number;
  readonly value: Value;
}

const TOKEN_HEADER = "x-studio-token";

const isObject = (value: Json): value is Fields =>
  value instanceof Object && !Array.isArray(value);

const parseText = (text: string): Json => {
  try {
    return JSON.parse(text) as Json;
  } catch {
    return text;
  }
};

const firstText = (result: TextResult): string =>
  result.content.map((part) => part.text ?? "").join("");

const timed = async <Value>(
  run: () => Promise<Value>
): Promise<Timed<Value>> => {
  const start = performance.now();
  const value = await run();
  const ms = Math.round(performance.now() - start);

  return { ms, value };
};

const studioJson = async <Value>(
  context: Context,
  route: string,
  body: Fields | null
): Promise<Value> => {
  const requestHeaders = new Headers({ [TOKEN_HEADER]: context.token });
  let init: RequestInit = { headers: requestHeaders, method: "GET" };

  if (body !== null) {
    requestHeaders.set("content-type", "application/json");
    init = {
      body: JSON.stringify(body),
      headers: requestHeaders,
      method: "POST",
    };
  }

  const res = await fetch(`${context.base}${route}`, init);

  if (!res.ok) {
    throw new Error(`${route} answered ${res.status}: ${await res.text()}`);
  }

  const parsed = (await res.json()) as Value;

  return parsed;
};

export { firstText, isObject, parseText, studioJson, timed, TOKEN_HEADER };

export type {
  Binding,
  CallableAction,
  Context,
  Fields,
  Json,
  Outcome,
  Skip,
  Surface,
  SurfaceResult,
  TextResult,
};
