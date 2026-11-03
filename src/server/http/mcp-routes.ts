import type { Hono } from "hono";

import type { McpApprovalPoll } from "../../shared/export.js";
import type { FrameStateDeps } from "../canvas/app-flow/frame-state-service.js";
import type { CanvasService } from "../canvas/service.js";
import { onSourceChange } from "../direct-edit/change-feed.js";
import type { EditRecorder } from "../direct-edit/index.js";
import type { ExportDeps } from "../export/source.js";
import { bindMcpLifeRuntime } from "../mcp-life/index.js";
import type { McpListenerRunnerApi } from "../mcp-life/index.js";
import {
  createActivityLog,
  createApprovalQueue,
  createCloudIntrospect,
  createMcpService,
} from "../mcp/index.js";
import type { ActivityLog, FixApp } from "../mcp/index.js";
import { recentPages, startRender } from "../preview/render-wait.js";
import { warmUpstream } from "../preview/warm-upstream.js";
import type { LayerLockStore } from "../store/layer-locks.js";
import type { AgentRunner, EventBus } from "../types.js";
import type { KeepVariant } from "../variations/routes.js";

interface McpRouteDeps extends ExportDeps {
  dataDir: string;
  studioToken: string;
  runner: AgentRunner;
  canvas: CanvasService;
  frameStates: FrameStateDeps;
  bus: EventBus;
  projectsFolder: () => Promise<string>;
  appOpen: () => boolean;
  history?: EditRecorder;
  listener: McpListenerRunnerApi | null;
  fixApp: FixApp;
  keepVariant: KeepVariant;
  layerLocks: LayerLockStore | null;
}

function warmAfterEdits(deps: McpRouteDeps): void {
  onSourceChange((change) => {
    const pages = recentPages(change.projectId);

    if (pages.length === 0) {
      return;
    }

    startRender(change.projectId, async (signal) => {
      const project = await deps.projects.get(change.projectId);

      const upstream = project.app
        ? await deps.preview.apps?.ensure(project).catch(() => null)
        : null;

      if (!upstream) {
        return;
      }

      const live = new Set(await deps.preview.livePages?.(project.id));

      for (const page of recentPages(project.id)) {
        if (signal.aborted) {
          return;
        }

        if (!live.has(`/${page}`)) {
          await warmUpstream(upstream, page || undefined, signal);
        }
      }
    });
  });
}

export interface ApprovalFeed {
  snapshot(): Promise<McpApprovalPoll>;
  watch(onChange: () => void): () => void;
}

export function registerMcpRoutes(
  _app: Hono,
  deps: McpRouteDeps
): { activity: ActivityLog; approvalFeed: ApprovalFeed } {
  const approvals = createApprovalQueue({
    appOpen: deps.appOpen,
    events: {
      opened: (approval) => {
        if (approval.projectId) {
          deps.bus.emit({
            type: "mcp.approval",
            projectId: approval.projectId,
            approval,
          });
        }
      },
      resolved: (approval, outcome) => {
        if (approval.projectId) {
          deps.bus.emit({
            type: "mcp.approval.resolved",
            projectId: approval.projectId,
            approvalId: approval.id,
            outcome,
          });
        }
      },
    },
  });

  const activity = createActivityLog(deps.dataDir, deps.bus);
  warmAfterEdits(deps);

  const mcp = createMcpService(deps.dataDir, deps, {
    edits: {
      ...deps,
      approvals,
      activity,
    },
    introspect: createCloudIntrospect(deps.runtime ?? null),
    listener: deps.listener,
  });

  void mcp.boot();

  const settingWatchers = new Set<() => void>();

  const approvalFeed: ApprovalFeed = {
    snapshot: async () =>
      (await mcp.editsOn())
        ? { edits: true, pending: approvals.list() }
        : { edits: false, pending: [] },
    watch(onChange) {
      settingWatchers.add(onChange);
      const stop = approvals.watch(onChange);

      return () => {
        settingWatchers.delete(onChange);
        stop();
      };
    },
  };

  const settingsChanged = (): void => {
    for (const fn of [...settingWatchers]) {
      fn();
    }
  };

  bindMcpLifeRuntime({
    activity,
    approvals,
    mcp,
    onSettingsChanged: settingsChanged,
  });

  return { activity, approvalFeed };
}
