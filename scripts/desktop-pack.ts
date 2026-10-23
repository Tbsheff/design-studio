import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagePackage } from '../desktop/build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface PackOptions {
  identity: string;
  updateUrl: string | null;
  outDir: string | null;
}

export function packOptions(env: NodeJS.ProcessEnv): PackOptions {
  const updateUrl = env.STUDIO_UPDATE_URL || null;
  if (updateUrl && !/^https?:\/\//.test(updateUrl)) throw new Error(`STUDIO_UPDATE_URL must be an http(s) URL, got ${updateUrl}`);
  return { identity: env.STUDIO_SIGN_IDENTITY || '-', updateUrl, outDir: env.STUDIO_PACK_OUT || null };
}

export function builderArgs(options: PackOptions): string[] {
  const args = ['--config', 'electron-builder.yml', '--mac', '--arm64', '--publish', 'never', `-c.mac.identity=${options.identity}`];
  if (options.updateUrl) args.push('-c.publish.provider=generic', `-c.publish.url=${options.updateUrl}`);
  if (options.outDir) args.push(`-c.directories.output=${options.outDir}`);
  return args;
}

async function main(): Promise<void> {
  const options = packOptions(process.env);
  await stagePackage();
  const env: NodeJS.ProcessEnv = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' };
  delete env.ELECTRON_RUN_AS_NODE;
  console.log(`[desktop] electron-builder: identity ${options.identity === '-' ? 'ad-hoc' : options.identity}, update feed ${options.updateUrl ?? 'none'}, notarize ${env.STUDIO_NOTARY_PROFILE ? `profile ${env.STUDIO_NOTARY_PROFILE}` : 'off'}`);
  const result = spawnSync(path.join(ROOT, 'node_modules', '.bin', 'electron-builder'), builderArgs(options), { cwd: ROOT, env, stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

const invokedDirectly = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
