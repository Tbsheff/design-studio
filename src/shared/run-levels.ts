import type {
  CheckViewport,
  ProjectSettings,
  QualitySeverity,
  RunLevel,
  RunTask,
} from "./contracts";
import { PORT_LEVEL_LABEL, PORT_TASK } from "./port";
import type { PortTask } from "./port";

export type PlaceholderMode = "off" | QualitySeverity;

interface LevelChecks {
  viewports: CheckViewport[];
  quality: boolean;
  navCheck: boolean;
  placeholder: PlaceholderMode;
  screenshots: boolean;
  critic: boolean;
  fixLoops: number;
}

export interface LevelPreset {
  label: string;
  hint: string;
  model: string | "project";
  maxTurns: number;
  skills: boolean;
  tasteAreas: string[] | "all";
  checks: LevelChecks;
  criticModel: string | null;
  criticBudgetUsd: number;
  criticMaxCalls: number;
  quickCritic?: boolean;
  regressionCheck?: boolean;
  screens?: ScreenPlan;
}

export interface ScreenPlan {
  maxScreens: number;
  maxImages: number;
  checkScreens: number;
}

export const WIREFRAME_MODEL = "claude-haiku-5-5";
const CRITIC_MODEL = "claude-sonnet-5-5";

export const LEVEL_PRESETS: Record<RunLevel, LevelPreset> = {
  polish: {
    checks: {
      critic: true,
      fixLoops: 3,
      navCheck: true,
      placeholder: "high",
      quality: true,
      screenshots: true,
      viewports: ["desktop", "tablet", "mobile"],
    },
    criticBudgetUsd: 0.1,
    criticMaxCalls: 2,
    criticModel: CRITIC_MODEL,
    hint: "Most thorough (usually ~$0.50 to $1.50, 2 to 6 minutes). All checks at 3 sizes, states, a fresh-eyes critic of every screen, a desktop regression check after fixes, one layout change if the layout is generic, and up to 3 fix loops.",
    label: "Polish",
    maxTurns: 40,
    model: "project",
    regressionCheck: true,
    screens: { checkScreens: 5, maxImages: 14, maxScreens: 6 },
    skills: true,
    tasteAreas: "all",
  },
  prototype: {
    checks: {
      critic: false,
      fixLoops: 1,
      navCheck: true,
      placeholder: "medium",
      quality: true,
      screenshots: true,
      viewports: ["desktop", "mobile"],
    },
    criticBudgetUsd: 0.05,
    criticMaxCalls: 1,
    criticModel: WIREFRAME_MODEL,
    hint: "Balanced (usually ~$0.30, 1 to 2 minutes). Full look with tool checks, one screenshot review and a quick fresh-eyes critic of every screen.",
    label: "Prototype",
    maxTurns: 30,
    model: "project",
    quickCritic: true,
    screens: { checkScreens: 3, maxImages: 8, maxScreens: 4 },
    skills: true,
    tasteAreas: "all",
  },
  wireframe: {
    checks: {
      critic: false,
      fixLoops: 1,
      navCheck: true,
      placeholder: "off",
      quality: false,
      screenshots: false,
      viewports: ["desktop", "mobile"],
    },
    criticBudgetUsd: 0,
    criticMaxCalls: 0,
    criticModel: null,
    hint: "Fastest and cheapest (usually ~$0.01, under a minute). Grayscale structure with real labels. Checks errors and mobile navigation only.",
    label: "Wireframe",
    maxTurns: 12,
    model: WIREFRAME_MODEL,
    skills: false,
    tasteAreas: ["layout", "behavior"],
  },
};

export interface ResolvedRunConfig {
  level: RunLevel;
  model: string;
  maxBudgetUsd: number | null;
  agentBudgetUsd: number | null;
  maxTurns: number;
  criticModel: string | null;
  preset: LevelPreset;
  task?: RunTask | PortTask;
}

function levelModel(
  preset: LevelPreset,
  settings: Pick<ProjectSettings, "model">
): string {
  return preset.model === "project" ? settings.model : preset.model;
}

function criticModelFor(preset: LevelPreset, model: string): string | null {
  if (!preset.criticModel) {
    return null;
  }

  if (preset.quickCritic) {
    return preset.criticModel;
  }

  return model.toLowerCase().includes("opus") ? model : preset.criticModel;
}

export function resolveRunConfig(
  settings: Pick<ProjectSettings, "model" | "maxBudgetUsd" | "maxTurns">,
  level: RunLevel
): ResolvedRunConfig {
  const preset = LEVEL_PRESETS[level];
  const model = levelModel(preset, settings);
  const maxBudgetUsd = settings.maxBudgetUsd ?? null;

  const criticReserve =
    preset.criticBudgetUsd *
    (preset.criticMaxCalls + (preset.regressionCheck ? 1 : 0));

  const agentBudgetUsd =
    maxBudgetUsd === null
      ? null
      : Math.round(Math.max(0.01, maxBudgetUsd - criticReserve) * 100) / 100;

  return {
    agentBudgetUsd,
    criticModel: criticModelFor(preset, model),
    level,
    maxBudgetUsd,
    maxTurns: Math.min(preset.maxTurns, settings.maxTurns),
    model,
    preset,
  };
}

export function levelOf(
  request: { level?: RunLevel },
  settings?: Partial<Pick<ProjectSettings, "defaultLevel">>
): RunLevel {
  return request.level ?? settings?.defaultLevel ?? "prototype";
}

const TWEAKS_TASK_BUDGET_USD = 0.25;
const TWEAKS_TASK_TURNS = 14;

function designSystemTask(config: ResolvedRunConfig): ResolvedRunConfig {
  const checks: LevelChecks = {
    ...config.preset.checks,
    critic: false,
    screenshots: true,
  };

  return {
    ...config,
    agentBudgetUsd: config.maxBudgetUsd,
    criticModel: null,
    preset: {
      ...config.preset,
      checks,
      criticBudgetUsd: 0,
      criticMaxCalls: 0,
      criticModel: null,
      quickCritic: false,
      regressionCheck: false,
      skills: false,
    },
    task: "design-system",
  };
}

const PORT_TASK_TURNS = 40;

const PORT_HINT =
  "Moves a prototype page into the app as one route with kit components and token classes, then checks it once with a review and a fix loop.";

function portTask(config: ResolvedRunConfig): ResolvedRunConfig {
  const checks: LevelChecks = {
    ...config.preset.checks,
    critic: false,
    fixLoops: 1,
    navCheck: true,
    quality: true,
    screenshots: true,
    viewports: ["desktop", "mobile"],
  };

  return {
    ...config,
    agentBudgetUsd: config.maxBudgetUsd,
    criticModel: null,
    maxTurns: Math.min(PORT_TASK_TURNS, config.maxTurns),
    preset: {
      ...config.preset,
      checks,
      criticBudgetUsd: 0,
      criticMaxCalls: 0,
      criticModel: null,
      hint: PORT_HINT,
      label: PORT_LEVEL_LABEL,
      quickCritic: false,
      regressionCheck: false,
      skills: false,
    },
    task: PORT_TASK,
  };
}

export function withRunTask(
  config: ResolvedRunConfig,
  task: RunTask | PortTask | undefined
): ResolvedRunConfig {
  if (task === PORT_TASK) {
    return portTask(config);
  }

  if (task === "design-system") {
    return designSystemTask(config);
  }

  if (task !== "tweaks") {
    return config;
  }

  const maxBudgetUsd =
    config.maxBudgetUsd === null
      ? null
      : Math.min(TWEAKS_TASK_BUDGET_USD, config.maxBudgetUsd);

  const checks: LevelChecks = {
    ...config.preset.checks,
    critic: false,
    fixLoops: 1,
    quality: false,
    screenshots: false,
    viewports: ["desktop", "mobile"],
  };

  return {
    ...config,
    agentBudgetUsd: maxBudgetUsd,
    criticModel: null,
    maxBudgetUsd,
    maxTurns: Math.min(TWEAKS_TASK_TURNS, config.maxTurns),
    model: WIREFRAME_MODEL,
    preset: {
      ...config.preset,
      checks,
      criticBudgetUsd: 0,
      criticMaxCalls: 0,
      criticModel: null,
      quickCritic: false,
      regressionCheck: false,
      skills: false,
    },
    task,
  };
}
