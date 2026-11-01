import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RENDER_IPC_ENV } from '../../shared/render-rpc.js';
import { isVaultReply, VAULT_MESSAGE, type VaultRequest } from '../../shared/vault-ipc.js';

export interface KeyVault {
  kind(): Promise<'keychain' | 'file'>;
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  clear(): Promise<void>;
}

const IPC_TIMEOUT_MS = 20_000;

function ipcAvailable(): boolean {
  return process.env[RENDER_IPC_ENV] === '1' && typeof process.send === 'function' && process.connected;
}

function askDesktop(op: VaultRequest['op'], data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = randomBytes(8).toString('hex');
    const timer = setTimeout(() => {
      process.off('message', onMessage);
      reject(new Error('The desktop app did not answer the Keychain request.'));
    }, IPC_TIMEOUT_MS);
    const onMessage = (raw: unknown) => {
      if (!isVaultReply(raw) || raw.id !== id) return;
      clearTimeout(timer);
      process.off('message', onMessage);
      if (raw.ok) resolve(raw.data);
      else reject(new Error(raw.error ?? 'The Keychain refused the request.'));
    };
    process.on('message', onMessage);
    process.send?.({ type: VAULT_MESSAGE, id, op, data } satisfies VaultRequest);
  });
}

async function writePrivate(file: string, text: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, text, { mode: 0o600 });
  await rename(temp, file);
}

export function createKeyVault(dir: string): KeyVault {
  const sealedFile = path.join(dir, 'publish-key.sealed');
  const plainFile = path.join(dir, 'publish-key.txt');
  let keychain: boolean | null = null;

  const kind = async (): Promise<'keychain' | 'file'> => {
    if (keychain === null) keychain = ipcAvailable() && (await askDesktop('probe', '').then((v) => v === 'yes').catch(() => false));
    return keychain ? 'keychain' : 'file';
  };

  return {
    kind,
    async get() {
      if ((await kind()) === 'keychain') {
        const sealed = await readFile(sealedFile, 'utf8').catch(() => null);
        return sealed ? askDesktop('open', sealed.trim()) : null;
      }
      const plain = await readFile(plainFile, 'utf8').catch(() => null);
      return plain ? plain.trim() : null;
    },
    async set(value) {
      if ((await kind()) === 'keychain') {
        await writePrivate(sealedFile, await askDesktop('seal', value));
        await rm(plainFile, { force: true });
        return;
      }
      await writePrivate(plainFile, value);
    },
    async clear() {
      await rm(sealedFile, { force: true });
      await rm(plainFile, { force: true });
    },
  };
}
