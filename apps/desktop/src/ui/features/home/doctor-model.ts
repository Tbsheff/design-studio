import type { Project } from "@design-studio/contracts";

import type { AppHealth } from "../../../shared/found-apps.js";
import type { DoctorProblem } from "./home-doctor.js";
import { shortHome } from "./home-model.js";

interface DoctorGate {
  readonly problem: DoctorProblem;
  readonly isChecking: boolean;
  readonly check: () => Promise<boolean>;
  readonly proceed: () => void;
}

const INSTALL_DETAIL =
  "Dependencies are not installed. Run the command below, then check again.";

const SHELL_SAFE = /^[\w./-]+$/u;

function shellPath(dir: string, homeDir: string | null): string {
  const short = shortHome(dir, homeDir);

  if (short === "~") {
    return "~";
  }

  if (short.startsWith("~/")) {
    const rest = short.slice(2);

    return SHELL_SAFE.test(rest) ? `~/${rest}` : `~/${JSON.stringify(rest)}`;
  }

  return SHELL_SAFE.test(short) ? short : JSON.stringify(short);
}

function homeCommand(
  command: string | null,
  homeDir: string | null
): string | null {
  const match = command?.match(/^cd ("(?:[^"\\]|\\.)*") && (.+)$/u);

  if (!match?.[1] || !match[2]) {
    return command;
  }

  try {
    return `cd ${shellPath(JSON.parse(match[1]) as string, homeDir)} && ${match[2]}`;
  } catch {
    return command;
  }
}

function installProblem(
  name: string,
  place: string,
  kindLabel: string,
  install: {
    readonly command: string;
    readonly dir: string;
    readonly homeDir: string | null;
  }
): DoctorProblem {
  return {
    badge: { label: kindLabel, tone: kindLabel === "Vite" ? "vite" : "next" },
    command: `cd ${shellPath(install.dir, install.homeDir)} && ${install.command}`,
    detail: INSTALL_DETAIL,
    name,
    place,
    steps: [
      { isOk: true, text: `package.json · ${kindLabel}` },
      { isOk: false, text: "node_modules is missing" },
    ],
  };
}

function healthProblem(
  project: Project,
  health: AppHealth,
  place: string,
  homeDir: string | null
): DoctorProblem {
  const label = project.app?.framework === "next" ? "Next.js" : "Vite";

  return {
    badge: { label, tone: label === "Vite" ? "vite" : "next" },
    command: homeCommand(health.command, homeDir),
    detail:
      health.state === "install"
        ? INSTALL_DETAIL
        : (health.detail ?? health.title ?? "The dev server cannot start."),
    name: project.name,
    place,
    steps: [
      { isOk: true, text: `package.json · ${label}` },
      {
        isOk: false,
        text:
          health.state === "install"
            ? "node_modules is missing"
            : (health.title ?? "The dev server failed"),
      },
    ],
  };
}

export {
  INSTALL_DETAIL,
  SHELL_SAFE,
  healthProblem,
  homeCommand,
  installProblem,
  shellPath,
};

export type { DoctorGate };
