import type { Project } from "@design-studio/contracts";

import type { AppHealth } from "./deps.js";
import { shortHome } from "./home-model.js";

interface DoctorStep {
  readonly isOk: boolean;
  readonly text: string;
}

interface DoctorProblem {
  readonly name: string;
  readonly place: string;
  readonly badge: { readonly label: string; readonly tone: string };
  readonly steps: DoctorStep[];
  readonly detail: string;
  readonly command: string | null;
}

interface DoctorGate {
  readonly problem: DoctorProblem;
  readonly isChecking: boolean;
  readonly check: () => Promise<boolean>;
  readonly proceed: () => void;
}

const INSTALL_DETAIL =
  "Dependencies are not installed. Run the command below, then check again.";

const INSTALL_DETAIL_NEUTRAL =
  "Dependencies are not installed. Install them in this folder with the package manager of the app, then check again.";

const HOME_COMMAND = /^cd (?<quoted>"(?:[^"\\]|\\.)*") && (?<rest>.+)$/u;

const SHELL_SAFE = /^[\w./-]+$/u;

const getShellPath = (dir: string, homeDir: string | null): string => {
  const short = shortHome(dir, homeDir);

  if (short === "~") {
    return "~";
  }

  if (short.startsWith("~/")) {
    const rest = short.slice(2);

    if (SHELL_SAFE.test(rest)) {
      return `~/${rest}`;
    }

    return `~/${JSON.stringify(rest)}`;
  }

  if (SHELL_SAFE.test(short)) {
    return short;
  }

  return JSON.stringify(short);
};

const getHomeCommand = (
  command: string | null,
  homeDir: string | null
): string | null => {
  const groups = command?.match(HOME_COMMAND)?.groups;

  if (!groups?.quoted || !groups.rest) {
    return command;
  }

  try {
    const dir = String(JSON.parse(groups.quoted));

    return `cd ${getShellPath(dir, homeDir)} && ${groups.rest}`;
  } catch {
    return command;
  }
};

const toKindTone = (label: string): string => {
  if (label === "Vite") {
    return "vite";
  }

  return "next";
};

const toInstallCommand = (install: {
  readonly command: string | null;
  readonly dir: string;
  readonly homeDir: string | null;
}): string | null => {
  if (install.command === null) {
    return null;
  }

  return `cd ${getShellPath(install.dir, install.homeDir)} && ${install.command}`;
};

const toInstallDetail = (command: string | null): string => {
  if (command === null) {
    return INSTALL_DETAIL_NEUTRAL;
  }

  return INSTALL_DETAIL;
};

const getInstallProblem = (
  projectName: string,
  placeLabel: string,
  kindLabel: string,
  install: {
    readonly command: string | null;
    readonly dir: string;
    readonly homeDir: string | null;
  }
): DoctorProblem => ({
  badge: { label: kindLabel, tone: toKindTone(kindLabel) },
  command: toInstallCommand(install),
  detail: toInstallDetail(install.command),
  name: projectName,
  place: placeLabel,
  steps: [
    { isOk: true, text: `package.json · ${kindLabel}` },
    { isOk: false, text: "node_modules is missing" },
  ],
});

const toFrameworkLabel = (project: Project): string => {
  if (project.app?.framework === "next") {
    return "Next.js";
  }

  return "Vite";
};

const toHealthDetail = (health: AppHealth): string => {
  if (health.state === "install") {
    return INSTALL_DETAIL;
  }

  return health.detail ?? health.title ?? "The dev server cannot start.";
};

const toHealthStep = (health: AppHealth): string => {
  if (health.state === "install") {
    return "node_modules is missing";
  }

  return health.title ?? "The dev server failed";
};

const getHealthProblem = (
  project: Project,
  health: AppHealth,
  placeLabel: string,
  homeDir: string | null
): DoctorProblem => {
  const label = toFrameworkLabel(project);

  return {
    badge: { label, tone: toKindTone(label) },
    command: getHomeCommand(health.command, homeDir),
    detail: toHealthDetail(health),
    name: project.name,
    place: placeLabel,
    steps: [
      { isOk: true, text: `package.json · ${label}` },
      { isOk: false, text: toHealthStep(health) },
    ],
  };
};

export {
  INSTALL_DETAIL,
  SHELL_SAFE,
  getHealthProblem as healthProblem,
  getHomeCommand as homeCommand,
  getInstallProblem as installProblem,
  getShellPath as shellPath,
};

export type { DoctorGate, DoctorProblem, DoctorStep };
