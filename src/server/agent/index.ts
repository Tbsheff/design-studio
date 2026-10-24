import path from 'node:path';
import { TOKENS_FILE } from '../../shared/contracts.js';
import type { Direction, Project } from '../../shared/contracts.js';
import { refreshDraftCoverage } from '../design-system/draft-project.js';
import { packRegistry, type PackRegistry } from '../design-system/packs.js';
import { buildErrorMessage, syncDesignSystem } from '../design-system/sync.js';
import type { AgentRunner, EventBus, PreviewService, ProjectStore, ServerConfig, VersionStore } from '../types.js';
import { createRunLifecycle } from './lifecycle.js';
import { createMockDriver } from './mock.js';
import { createSdkDriver } from './sdk-driver.js';

interface AgentRunnerDeps {
  config: ServerConfig;
  bus: EventBus;
  projects: ProjectStore;
  versions: VersionStore;
  preview: PreviewService;
}

function claudeExecutableOption(): { claudeExecutable?: string } {
  const executable = process.env.STUDIO_CLAUDE_PATH;
  return executable ? { claudeExecutable: executable } : {};
}

export function createAgentRunner(deps: AgentRunnerDeps): AgentRunner {
  const driver = deps.config.agentMode === 'mock' ? createMockDriver() : createSdkDriver({ preview: deps.preview, skillsRoot: path.join(deps.config.dataDir, 'skills-plugins'), ...claudeExecutableOption() });
  const registry = packRegistry(undefined, { userDir: path.join(deps.config.dataDir, 'packs') });
  return createRunLifecycle({ ...deps, beforeCommit: designSystemBeforeCommit(deps.bus, registry) }, driver);
}

export function designSystemBeforeCommit(bus: EventBus, registry?: PackRegistry): (project: Project, direction: Direction) => Promise<void> {
  return async (project, direction) => {
    if (project.designSystemFor && registry) {
      await refreshDraftCoverage(direction.workTree, registry).catch((error: unknown) => console.error(`[agent] coverage refresh failed for ${project.id}`, error));
    }
    const result = await syncDesignSystem(direction.workTree);
    if (result.errors.length === 0) return;
    bus.emit({
      type: 'preview.build-error',
      projectId: project.id,
      directionId: direction.id,
      message: buildErrorMessage(result.errors),
      file: TOKENS_FILE,
    });
  };
}
