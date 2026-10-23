import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ServerConfig } from '../types.js';

export async function makeTempConfig(): Promise<{ config: ServerConfig; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'studio test '));
  const dataDir = path.join(root, 'data');
  await mkdir(dataDir);
  const config: ServerConfig = {
    dataDir,
    projectsDir: path.join(root, 'Design Studio'),
    studioPort: 0,
    previewPort: 0,
    vitePortBase: 0,
    studioToken: 'test-token',
    agentMode: 'mock',
    studioOrigin: 'http://127.0.0.1:0',
    previewOrigin: 'http://127.0.0.1:0',
  };
  return { config, cleanup: () => rm(root, { recursive: true, force: true }) };
}
