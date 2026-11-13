import { createHash } from "node:crypto";

const toMarkupHash = (normal: string): string =>
  createHash("sha256").update(normal).digest("hex");

export { toMarkupHash };
