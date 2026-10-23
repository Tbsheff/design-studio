import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { packagedResource } from '../resources.js';

const BRIDGE_ENTRY = fileURLToPath(new URL('../../bridge/bridge.ts', import.meta.url));

let bundlePromise: Promise<string> | null = null;

async function bundleBridge(): Promise<string> {
  const { build } = await import('esbuild');
  const result = await build({
    entryPoints: [BRIDGE_ENTRY],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'silent',
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error('esbuild produced no output for bridge.ts');
  return output.text;
}

const PREBUILT_BRIDGE_FILE = 'bridge.js';

function prebuiltOrBundle(): Promise<string> {
  const prebuilt = packagedResource(PREBUILT_BRIDGE_FILE);
  return prebuilt ? readFile(prebuilt, 'utf8') : bundleBridge();
}

export function loadBridgeScript(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = prebuiltOrBundle().catch((error: unknown) => {
      bundlePromise = null;
      throw error;
    });
  }
  return bundlePromise;
}
