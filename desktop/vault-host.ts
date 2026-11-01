import type { ChildProcess } from "node:child_process";

import { safeStorage } from "electron";

import {
  isVaultRequest,
  VAULT_MESSAGE,
  type VaultReply,
  type VaultRequest,
} from "../src/shared/vault-ipc.js";

function answer(request: VaultRequest): VaultReply {
  const reply = (
    ok: boolean,
    data: string,
    error: string | null
  ): VaultReply => ({ type: VAULT_MESSAGE, id: request.id, ok, data, error });

  if (!safeStorage.isEncryptionAvailable()) {
    return request.op === "probe"
      ? reply(true, "no", null)
      : reply(false, "", "The macOS Keychain is not available.");
  }

  try {
    if (request.op === "probe") {
      return reply(true, "yes", null);
    }

    if (request.op === "seal") {
      return reply(
        true,
        safeStorage.encryptString(request.data).toString("base64"),
        null
      );
    }

    return reply(
      true,
      safeStorage.decryptString(Buffer.from(request.data, "base64")),
      null
    );
  } catch (error) {
    return reply(
      false,
      "",
      error instanceof Error ? error.message.slice(0, 200) : "Keychain error"
    );
  }
}

export function attachVault(child: ChildProcess): void {
  child.on("message", (raw: unknown) => {
    if (!isVaultRequest(raw) || !child.connected) {
      return;
    }

    child.send(answer(raw));
  });
}
