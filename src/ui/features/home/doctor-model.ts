import type { Project } from "../../../shared/contracts.js";
import type { AppHealth } from "../../../shared/found-apps.js";
import type { DoctorProblem } from "./home-doctor.js";
import { shortHome } from "./home-model.js";

interface DoctorGate {
  problem: DoctorProblem;
  checking: boolean;
  check: () => Promise<boolean>;
  proceed: () => void;
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
  install: { command: string; dir: string },
  homeDir: string | null
): DoctorProblem {
  return {
    name,
    place,
    badge: { label: kindLabel, tone: kindLabel === "Vite" ? "vite" : "next" },
    steps: [
      { ok: true, text: `package.json · ${kindLabel}` },
      { ok: false, text: "node_modules is missing" },
    ],
    detail: INSTALL_DETAIL,
    command: `cd ${shellPath(install.dir, homeDir)} && ${install.command}`,
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
    name: project.name,
    place,
    badge: { label, tone: label === "Vite" ? "vite" : "next" },
    steps: [
      { ok: true, text: `package.json · ${label}` },
      {
        ok: false,
        text:
          health.state === "install"
            ? "node_modules is missing"
            : (health.title ?? "The dev server failed"),
      },
    ],
    detail:
      health.state === "install"
        ? INSTALL_DETAIL
        : (health.detail ?? health.title ?? "The dev server cannot start."),
    command: homeCommand(health.command, homeDir),
  };
}

export {
  SHELL_SAFE,
  INSTALL_DETAIL,
  installProblem,
  healthProblem,
  shellPath,
  homeCommand,
};

export type { DoctorGate };
