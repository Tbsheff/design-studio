import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createAgentRunner } from '../../src/server/agent/index.js';
import { loadConfig } from '../../src/server/config.js';
import { createApp } from '../../src/server/http/app.js';
import { createPreviewService } from '../../src/server/preview/index.js';
import { createEventBus } from '../../src/server/store/events.js';
import { createProjectStore } from '../../src/server/store/projects.js';
import { createVersionStore } from '../../src/server/store/versions.js';

async function main(): Promise<void> {
  const uiDir = process.env.PERF_UI_DIR;
  if (!uiDir) throw new Error('PERF_UI_DIR is required');
  const config = loadConfig();
  await mkdir(path.join(config.dataDir, 'projects'), { recursive: true });
  const versions = createVersionStore(config);
  const projects = createProjectStore(config, versions);
  const bus = createEventBus(config.dataDir);
  const preview = createPreviewService({ config, bus, projects, versions });
  const runner = createAgentRunner({ config, bus, projects, versions, preview });
  const app = createApp({ config, bus, projects, versions, runner, preview, uiDir: path.resolve(uiDir) });
  const server = serve({ fetch: app.fetch, port: config.studioPort, hostname: '127.0.0.1' }, () => {
    console.log(`perf server ready ${config.studioOrigin}`);
  });
  await preview.start();
  const stop = (): void => {
    server.close();
    preview
      .stop()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error: unknown) => {
  console.error('[perf server] failed', error);
  process.exit(1);
});
