import path from "node:path";

import type { Project } from "@design-studio/contracts";

import { inspectDeclaredTokens } from "./chart-css.js";
import { inspectChartKit } from "./chart-kit.js";
import type { ChartKit } from "./chart-kit.js";
import { inspectRechartsVersion } from "./chart-recharts.js";
import { toColorTokens } from "./engine/index.js";
import type { ChartKind } from "./engine/index.js";

type ChartMode = "kit" | "recharts" | "svg";

interface ChartInspection {
  readonly colorTokens: readonly string[];
  readonly kinds: readonly ChartKind[];
  readonly kit: ChartKit | null;
  readonly mode: ChartMode;
  readonly rechartsVersion: string | null;
}

const KINDS: readonly ChartKind[] = ["bar", "line", "area", "pie", "sparkline"];

const toPackageDirs = (
  project: Project,
  workTree: string,
  kit: ChartKit | null
): string[] => {
  const dirs = [workTree];
  const appDir = project.app?.appDir ?? ".";

  if (appDir !== ".") {
    dirs.unshift(path.join(workTree, appDir));
  }

  if (kit?.packageDir) {
    dirs.push(kit.packageDir);
  }

  return dirs;
};

const toMode = (
  kit: ChartKit | null,
  rechartsVersion: string | null
): ChartMode => {
  if (kit !== null) {
    return "kit";
  }

  if (rechartsVersion !== null) {
    return "recharts";
  }

  return "svg";
};

const inspectChartProject = async (
  project: Project,
  workTree: string
): Promise<ChartInspection> => {
  const chartKit = await inspectChartKit(project, workTree);
  let version: string | null = null;

  if (project.kind === "react") {
    version = await inspectRechartsVersion(
      toPackageDirs(project, workTree, chartKit)
    );
  }

  const declared = await inspectDeclaredTokens(workTree);

  return {
    colorTokens: toColorTokens(declared),
    kinds: KINDS,
    kit: chartKit,
    mode: toMode(chartKit, version),
    rechartsVersion: version,
  };
};

export { inspectChartProject };

export type { ChartInspection, ChartMode };
