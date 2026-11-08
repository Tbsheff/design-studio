export { loadConfig } from "../../platform/config/index.js";

export {
  listFileNames,
  toJsonFileReader,
} from "../../platform/local-file/index.js";

export { setPrivateJson } from "../../platform/atomic-write/index.js";

export { attemptKnown } from "../../platform/attempt/index.js";

export { toDecoder } from "../../platform/decode/index.js";

export { createKeyVault } from "../index.js";

export type { KnownFailure } from "../../platform/attempt/index.js";

export type { KeyVault } from "../index.js";
