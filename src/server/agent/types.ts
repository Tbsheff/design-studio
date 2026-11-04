import type {
  CheckViewport,
  PermissionRequest,
  QualityFinding,
  RenderCheckResult,
} from "../../shared/contracts.js";
import type { ResolvedRunConfig } from "../../shared/run-levels.js";
import type { FrameStateDeps } from "../canvas/app-flow/index.js";
import type { CanvasService } from "../canvas/index.js";
import type { ProbeRect } from "../preview/quality-probe.js";
import type {
  CommandRuleRole,
  CommandRuleScope,
} from "../store/command-rules.js";
import type { LoopLog } from "./polish-loop.js";
import type { RunScreen } from "./screens.js";

interface BaselineShot {
  viewport: CheckViewport;
  url?: string;
  path: string;
  selectionRects: ProbeRect[];
}

interface RunToolState {
  config: ResolvedRunConfig;
  shots?: number;
  log?: LoopLog;
  counters?: { shots: number; checks: number; mobileShots?: number };
  spentUsd: () => number;
  criticCostUsd: number;
  criticCalls: number;
  lastFindings: QualityFinding[];
  lastChecks: RenderCheckResult[];
  baseline: Promise<BaselineShot[]> | null;
  canvas?: CanvasService;
  frameStates?: FrameStateDeps | null;
  startedAt?: number;
  screenCache?: { stamp: string; screens: RunScreen[] };
  lastScreens?: RunScreen[];
  reviewShots?: CriticImage[];
  isRegressionDone?: boolean;
  regressionNote?: string;
  captureMark?: number;
  reviews?: { at: number; frame: string | null }[];
}

interface CriticImage {
  label: string;
  data: string;
  key?: string;
  screen?: string;
  viewport?: "desktop" | "mobile";
  path?: string;
}

type PermissionAsk = Omit<PermissionRequest, "id">;

interface DevicePolicy {
  readonly canInstall: boolean;
  readonly canRunBash: boolean;
}

interface DevicePolicyInput {
  readonly capAllowBash: boolean | null;
  readonly capAllowInstall: boolean | null;
  readonly role: CommandRuleRole | null;
  readonly scope: CommandRuleScope | null;
}

interface DevicePolicySource {
  readonly read: (projectId: string) => Promise<DevicePolicyInput>;
}

interface CommandRules {
  allows: (command: string) => Promise<boolean>;
  remember: (rule: string) => Promise<void>;
}

export type {
  BaselineShot,
  CommandRules,
  CriticImage,
  DevicePolicy,
  DevicePolicyInput,
  DevicePolicySource,
  PermissionAsk,
  RunToolState,
};
