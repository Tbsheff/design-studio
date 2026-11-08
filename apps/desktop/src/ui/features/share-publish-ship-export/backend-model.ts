import type { PublishBackendState } from "../../../shared/publish.js";
import { pick } from "./pick.js";

const toBackendSummary = (backend: PublishBackendState): string => {
  if (backend.running) {
    return "Setting up. Each step shows its result below.";
  }

  if (backend.ready && backend.url) {
    return `Ready. One Worker serves every published design at ${backend.url}${pick(backend.mode === "local", " (local test server)", "")}.`;
  }

  if (backend.error) {
    return backend.error;
  }

  return "Not set up. Setup makes an R2 bucket, a D1 database and one publish Worker in your Cloudflare account. A re-run is safe.";
};

const toKeyStoreText = (keyStore: string): string =>
  pick(
    keyStore === "keychain",
    "In the macOS Keychain",
    "In a private file on this Mac (the Keychain needs the desktop app)"
  );

export { toBackendSummary, toKeyStoreText };
