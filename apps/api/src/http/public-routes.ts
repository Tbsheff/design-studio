interface PublicRoute {
  readonly method: string;
  readonly path: string;
  readonly reason: string;
}

const PUBLIC_ROUTES = [
  { method: "GET", path: "/health", reason: "liveness probe" },
  { method: "GET", path: "/api/auth/*", reason: "auth gateway reads" },
  { method: "POST", path: "/api/auth/*", reason: "auth gateway sign-in" },
] as const satisfies readonly PublicRoute[];

const STATE_CHANGING = new Set(["DELETE", "PATCH", "POST", "PUT"]);

const isPublicRoute = (method: string, path: string): boolean =>
  PUBLIC_ROUTES.some((route) => {
    if (route.method !== method.toUpperCase()) {
      return false;
    }

    if (route.path.endsWith("/*")) {
      return path.startsWith(route.path.slice(0, -1));
    }

    return route.path === path;
  });

const isJsonContentType = (value: string | null): boolean =>
  value !== null && /^application\/json\s*(?:;|$)/iu.test(value);

const isSameOrigin = (origin: string | null, requestUrl: string): boolean => {
  if (origin === null) {
    return true;
  }

  return origin === new URL(requestUrl).origin;
};

const refusePublicRequest = (
  request: Request,
  allowedOrigins: readonly string[]
): Response | null => {
  if (!STATE_CHANGING.has(request.method.toUpperCase())) {
    return null;
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return Response.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  const origin = request.headers.get("origin");

  const isAllowed =
    isSameOrigin(origin, request.url) ||
    (origin !== null && allowedOrigins.includes(origin));

  if (!isAllowed) {
    return Response.json({ error: "forbidden_origin" }, { status: 403 });
  }

  return null;
};

export { PUBLIC_ROUTES, isJsonContentType, isPublicRoute, refusePublicRequest };

export type { PublicRoute };
