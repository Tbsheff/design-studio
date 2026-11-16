import { env } from "node:process";

const toFirstSet = (values: readonly (string | undefined)[]): string | null =>
  values.find((value) => (value ?? "").trim() !== "") ?? null;

const toWebOrigin = (): string | null => toFirstSet([env.STUDIO_WEB_ORIGIN]);

const toApiOrigin = (): string | null =>
  toFirstSet([env.STUDIO_API_ORIGIN, env.STUDIO_WEB_ORIGIN]);

export { toApiOrigin, toWebOrigin };
