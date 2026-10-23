import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ServerConfig } from '../types.js';

export async function makeTempConfig(): Promise<{ config: ServerConfig; cleanup: () => Promise<void> }> {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'studio test '));
  const config: ServerConfig = {
    dataDir,
    studioPort: 0,
    previewPort: 0,
    vitePortBase: 0,
    studioToken: 'test-token',
    agentMode: 'mock',
    studioOrigin: 'http://127.0.0.1:0',
    previewOrigin: 'http://127.0.0.1:0',
  };
  return { config, cleanup: () => rm(dataDir, { recursive: true, force: true }) };
}
