import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createAgentRunner } from './agent/index.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { loadBridgeScript } from './preview/bridge-bundle.js';
import { createPreviewService } from './preview/index.js';
import { createEventBus } from './store/events.js';
import { acquireDataLock, DataDirLockedError, LOCKED_EXIT_CODE } from './store/data-lock.js';
import { createProjectStore } from './store/projects.js';
import { watchParent } from './parent-watch.js';
import { desktopSender, linkDesktop } from './desktop-link.js';
import { createVersionStore } from './store/versions.js';

async function watchExisting(
  preview: ReturnType<typeof createPreviewService>,
  versions: ReturnType<typeof createVersionStore>,
  projects: ReturnType<typeof createProjectStore>,
): Promise<void> {
  for (const project of await projects.list()) {
    await versions.ensureRepo(project);
    for (const direction of project.directions) {
      try {
        preview.watch(project, direction);
      } catch (error) {
        console.error(`[studio] cannot watch ${project.id}/${direction.id}`, error);
      }
    }
  }
}

async function warmPreview(
  config: ReturnType<typeof loadConfig>,
  preview: ReturnType<typeof createPreviewService>,
  versions: ReturnType<typeof createVersionStore>,
  projects: ReturnType<typeof createProjectStore>,
): Promise<void> {
  try {
    await watchExisting(preview, versions, projects);
    await loadBridgeScript();
  } catch (error) {
    console.error('[studio] preview warm-up failed', error, config.dataDir);
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  await mkdir(path.join(config.dataDir, 'projects'), { recursive: true });
  const releaseLock = acquireDataLock(config.dataDir, config.studioPort);
  process.on('exit', releaseLock);

  const versions = createVersionStore(config);
  const projects = createProjectStore(config, versions);
  const desktop = desktopSender();
  const baseBus = createEventBus(config.dataDir);
  const bus = desktop ? linkDesktop(baseBus, desktop, { token: config.studioToken, dataDir: config.dataDir }) : baseBus;
  const preview = createPreviewService({ config, bus, projects, versions });
  const runner = createAgentRunner({ config, bus, projects, versions, preview });

  const app = createApp({ config, bus, projects, versions, runner, preview });
  const server = serve({ fetch: app.fetch, port: config.studioPort, hostname: '127.0.0.1' }, () => {
    console.log(`Design Studio running at ${config.studioOrigin} (agent: ${config.agentMode}, data: ${config.dataDir})`);
  });

  await preview.start();
  void warmPreview(config, preview, versions, projects);

  let stopping = false;
  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    console.log(`[studio] ${signal} received, shutting down`);
    const forceExit = setTimeout(() => process.exit(1), 5000);
    forceExit.unref();
    server.close();
    preview
      .stop()
      .catch((error: unknown) => console.error('[studio] preview stop failed', error))
      .finally(() => process.exit(0));
  };
  watchParent(() => shutdown('parent exit'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  if (error instanceof DataDirLockedError) {
    console.error(`[studio] ${error.message}`);
    process.exit(LOCKED_EXIT_CODE);
  }
  console.error('[studio] failed to start', error);
  process.exit(1);
});
