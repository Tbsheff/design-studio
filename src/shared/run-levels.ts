import type { CheckViewport, ProjectSettings, QualitySeverity, RunLevel, RunTask } from './contracts';

export type PlaceholderMode = 'off' | QualitySeverity;

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
  model: string | 'project';
  maxTurns: number;
  skills: boolean;
  tasteAreas: string[] | 'all';
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

export const WIREFRAME_MODEL = 'claude-haiku-5-5';
const CRITIC_MODEL = 'claude-sonnet-5-5';

export const LEVEL_PRESETS: Record<RunLevel, LevelPreset> = {
  wireframe: {
    label: 'Wireframe',
    hint: 'Fastest and cheapest (usually ~$0.01, under a minute). Grayscale structure with real labels. Checks errors and mobile navigation only.',
    model: WIREFRAME_MODEL,
    maxTurns: 12,
    skills: false,
    tasteAreas: ['layout', 'behavior'],
    checks: { viewports: ['desktop', 'mobile'], quality: false, navCheck: true, placeholder: 'off', screenshots: false, critic: false, fixLoops: 1 },
    criticModel: null,
    criticBudgetUsd: 0,
    criticMaxCalls: 0,
  },
  prototype: {
    label: 'Prototype',
    hint: 'Balanced (usually ~$0.30, 1 to 2 minutes). Full look with tool checks, one screenshot review and a quick fresh-eyes critic of every screen.',
    model: 'project',
    maxTurns: 30,
    skills: true,
    tasteAreas: 'all',
    checks: { viewports: ['desktop', 'mobile'], quality: true, navCheck: true, placeholder: 'medium', screenshots: true, critic: false, fixLoops: 1 },
    criticModel: WIREFRAME_MODEL,
    criticBudgetUsd: 0.05,
    criticMaxCalls: 1,
    quickCritic: true,
    screens: { maxScreens: 4, maxImages: 8, checkScreens: 3 },
  },
  polish: {
    label: 'Polish',
    hint: 'Most thorough (usually ~$0.50 to $1.50, 2 to 6 minutes). All checks at 3 sizes, states, a fresh-eyes critic of every screen, a desktop regression check after fixes, one layout change if the layout is generic, and up to 3 fix loops.',
    model: 'project',
    maxTurns: 40,
    skills: true,
    tasteAreas: 'all',
    checks: { viewports: ['desktop', 'tablet', 'mobile'], quality: true, navCheck: true, placeholder: 'high', screenshots: true, critic: true, fixLoops: 3 },
    criticModel: CRITIC_MODEL,
    criticBudgetUsd: 0.15,
    criticMaxCalls: 2,
    regressionCheck: true,
    screens: { maxScreens: 6, maxImages: 14, checkScreens: 5 },
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
  task?: RunTask;
}

function levelModel(preset: LevelPreset, settings: Pick<ProjectSettings, 'model'>): string {
  return preset.model === 'project' ? settings.model : preset.model;
}

function criticModelFor(preset: LevelPreset, model: string): string | null {
  if (!preset.criticModel) return null;
  if (preset.quickCritic) return preset.criticModel;
  return model.toLowerCase().includes('opus') ? model : preset.criticModel;
}

export function resolveRunConfig(settings: Pick<ProjectSettings, 'model' | 'maxBudgetUsd' | 'maxTurns'>, level: RunLevel): ResolvedRunConfig {
  const preset = LEVEL_PRESETS[level];
  const model = levelModel(preset, settings);
  const maxBudgetUsd = settings.maxBudgetUsd ?? null;
  const criticReserve = preset.criticBudgetUsd * (preset.criticMaxCalls + (preset.regressionCheck ? 1 : 0));
  const agentBudgetUsd = maxBudgetUsd === null ? null : Math.round(Math.max(0.01, maxBudgetUsd - criticReserve) * 100) / 100;
  return {
    level,
    model,
    maxBudgetUsd,
    agentBudgetUsd,
    maxTurns: Math.min(preset.maxTurns, settings.maxTurns),
    criticModel: criticModelFor(preset, model),
    preset,
  };
}

export function levelOf(request: { level?: RunLevel }, settings?: Partial<Pick<ProjectSettings, 'defaultLevel'>>): RunLevel {
  return request.level ?? settings?.defaultLevel ?? 'prototype';
}

const TWEAKS_TASK_BUDGET_USD = 0.25;
const TWEAKS_TASK_TURNS = 14;

function designSystemTask(config: ResolvedRunConfig): ResolvedRunConfig {
  const checks: LevelChecks = { ...config.preset.checks, screenshots: true, critic: false };
  return { ...config, agentBudgetUsd: config.maxBudgetUsd, criticModel: null, preset: { ...config.preset, skills: false, checks, criticModel: null, criticBudgetUsd: 0, criticMaxCalls: 0, quickCritic: false, regressionCheck: false }, task: 'design-system' };
}

export function withRunTask(config: ResolvedRunConfig, task: RunTask | undefined): ResolvedRunConfig {
  if (task === 'design-system') return designSystemTask(config);
  if (task !== 'tweaks') return config;
  const maxBudgetUsd = config.maxBudgetUsd === null ? null : Math.min(TWEAKS_TASK_BUDGET_USD, config.maxBudgetUsd);
  const checks: LevelChecks = { ...config.preset.checks, viewports: ['desktop', 'mobile'], quality: false, screenshots: false, critic: false, fixLoops: 1 };
  return {
    ...config,
    model: WIREFRAME_MODEL,
    maxBudgetUsd,
    agentBudgetUsd: maxBudgetUsd,
    maxTurns: Math.min(TWEAKS_TASK_TURNS, config.maxTurns),
    criticModel: null,
    preset: { ...config.preset, skills: false, checks, criticModel: null, criticBudgetUsd: 0, criticMaxCalls: 0, quickCritic: false, regressionCheck: false },
    task,
  };
}
