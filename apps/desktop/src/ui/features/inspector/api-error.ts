import type { ApiError } from "../../api.js";

const isApiError = (err: unknown): err is ApiError =>
  err instanceof Error &&
  typeof (err as { readonly tag?: unknown }).tag === "string";

const isApiConflict = (err: unknown): boolean =>
  isApiError(err) && err.status === 409;

export { isApiConflict, isApiError };
