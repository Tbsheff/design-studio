import type { RunLevel } from "@design-studio/contracts";
import { parseEnvText } from "@design-studio/contracts/app";
import { shortenHome } from "@design-studio/contracts/folders";
import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import { ApiError, api } from "../../api.js";
import { copy } from "./copy.js";
import type { AppChip, RunMode } from "./home-app-chip.js";
import { Pop } from "./home-popovers.js";
import type { Close } from "./home-popovers.js";

import "../../styles/attach-app.css";

const RETRY_MS = 1000;
const RETRY_LIMIT = 20;

function attachRequest(chip: AppChip): {
  readonly folder: string;
  readonly appDir: string;
  readonly url?: string;
  readonly env: Record<string, string>;
} {
  const found = chip.inspection;

  if (!found) {
    throw new Error("The folder is still being checked.");
  }

  const parsed = parseEnvText(chip.env);

  if (parsed.bad.length > 0) {
    throw new Error(`Use KEY=value lines. Not valid: ${parsed.bad[0] ?? ""}`);
  }

  if (chip.mode === "url" && !chip.url.trim()) {
    throw new Error(
      "Type the URL of your running dev server, or let the studio start next dev."
    );
  }

  return {
    folder: found.path,
    appDir: chip.appDir ?? found.appDir ?? ".",
    ...(chip.mode === "url" ? { url: chip.url.trim() } : {}),
    env: parsed.env,
  };
}

const openChip = async (chip: AppChip, tokensOnly = false): Promise<string> => {
  const found = chip.inspection;

  if (!found?.kind || found.problem) {
    throw new Error(
      found?.problem ??
        "Pick a Next.js app, a Vite app or a folder with an index.html."
    );
  }

  if (tokensOnly || found.kind !== "next") {
    return (
      found.projectId ??
      (await api.importProject(found.path, { skipApp: true })).project.id
    );
  }

  if (found.projectId && chip.mode === "start" && !chip.env.trim()) {
    return found.projectId;
  }

  return (await api.attachApp(attachRequest(chip))).project.id;
};

function keepEnter(
  event: KeyboardEvent<HTMLInputElement>,
  run?: () => void
): void {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  run?.();
}

const wait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms));

const runInProject = async (
  projectId: string,
  input: {
    readonly prompt: string;
    readonly level: RunLevel;
    readonly images: File[];
    readonly referenceUrls: string[];
  }
): Promise<void> => {
  const project = await api.getProject(projectId);

  const main =
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0];

  if (!main) {
    throw new Error("The project has no direction to edit.");
  }

  const uploaded = await Promise.all(
    input.images.map((file) => api.uploadAttachment(projectId, file))
  );

  const request = {
    level: input.level,
    mode: "edit" as const,
    prompt: input.prompt,
    ...(uploaded.length > 0
      ? { attachmentIds: uploaded.map((item) => item.id) }
      : {}),
    ...(input.referenceUrls.length > 0
      ? { referenceUrls: input.referenceUrls }
      : {}),
  };

  for (let attempt = 0; ; attempt += 1) {
    try {
      await api.startRun(projectId, main.id, request);

      return;
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 409 ||
        attempt >= RETRY_LIMIT
      ) {
        throw error;
      }

      await wait(RETRY_MS);
    }
  }
};

const Candidates = ({
  chip,
  onChange,
}: {
  readonly chip: AppChip;
  readonly onChange: (patch: Partial<AppChip>) => void;
}): ReactElement | null => {
  const found = chip.inspection;

  if (!found || found.candidates.length < 2) {
    return null;
  }

  const chosen = chip.appDir ?? found.appDir;

  return (
    <div className="ui-menu-section" role="radiogroup" aria-label={copy.app}>
      <span className="ui-menu-label">
        {found.name} has {found.candidates.length} Next.js apps
      </span>
      {found.candidates.map((candidate) => (
        <button
          key={candidate.appDir}
          type="button"
          role="radio"
          aria-checked={chosen === candidate.appDir}
          className="ui-menu-item"
          onClick={() => onChange({ appDir: candidate.appDir })}
        >
          <Icon
            name={chosen === candidate.appDir ? "check" : "code"}
            size={14}
          />
          <span className="truncate mono">{candidate.appDir}</span>
          <span className="ui-menu-meta truncate">{candidate.name}</span>
        </button>
      ))}
    </div>
  );
};

const DevServer = ({
  chip,
  onChange,
}: {
  readonly chip: AppChip;
  readonly onChange: (patch: Partial<AppChip>) => void;
}): ReactElement => {
  const [envOpen, setEnvOpen] = useState(() => chip.env.trim() !== "");
  const mode = (next: RunMode) => (): void => onChange({ mode: next });

  return (
    <div className="ui-menu-section home-app-server">
      <span className="ui-menu-label">Dev server</span>
      <div className="segmented" role="radiogroup" aria-label={copy.devServer}>
        <button
          type="button"
          role="radio"
          aria-checked={chip.mode === "start"}
          className={chip.mode === "start" ? "on" : ""}
          onClick={mode("start")}
        >
          Start next dev
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={chip.mode === "url"}
          className={chip.mode === "url" ? "on" : ""}
          onClick={mode("url")}
        >
          Use my running server
        </button>
      </div>
      {chip.mode === "url" && (
        <input
          className="mono"
          aria-label={copy.devServerUrl}
          value={chip.url}
          placeholder={copy.httpLocalhost3000}
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => keepEnter(e)}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      )}
      <button
        type="button"
        className="ui-menu-item"
        aria-expanded={envOpen}
        onClick={() => setEnvOpen((v) => !v)}
      >
        <Icon name={envOpen ? "chevronDown" : "chevronRight"} size={14} />
        <span>Environment for next dev</span>
      </button>
      {envOpen && (
        <textarea
          className="mono"
          rows={3}
          value={chip.env}
          placeholder={copy.skipEnvValidationTrue}
          spellCheck={false}
          aria-label={copy.environmentForNextDev}
          onChange={(e) => onChange({ env: e.target.value })}
        />
      )}
    </div>
  );
};

interface AppMenuProps {
  readonly chip: AppChip;
  readonly homeDir: string | null;
  readonly trigger: RefObject<HTMLElement | null>;
  readonly isClosing: boolean;
  readonly onClose: Close;
  readonly onChange: (patch: Partial<AppChip>) => void;
  readonly onTokensOnly: () => void;
}

const AppMenu = ({
  chip,
  homeDir,
  trigger,
  isClosing,
  onClose,
  onChange,
  onTokensOnly,
}: AppMenuProps): ReactElement => {
  const found = chip.inspection;
  const problem = chip.error ?? found?.problem ?? null;

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      className="ui-menu home-app-menu"
      label="App options"
    >
      <div className="ui-menu-section">
        <span className="ui-menu-label mono truncate">
          {shortenHome(
            (found?.path ?? chip.path).replace(/^\/private(?=\/)/u, ""),
            homeDir
          )}
        </span>
        {problem && (
          <p className="home-app-note" role="alert">
            {problem}
          </p>
        )}
        {found?.workspace && (
          <p className="home-app-note">
            Opens as part of the {found.workspace.name} monorepo.
          </p>
        )}
        {found?.projectId && (
          <p className="home-app-note">Already a project. Return opens it.</p>
        )}
      </div>
      {found?.kind === "next" && !problem && (
        <>
          <Candidates chip={chip} onChange={onChange} />
          <DevServer chip={chip} onChange={onChange} />
          <div className="ui-menu-section">
            <button
              type="button"
              className="ui-menu-item"
              onClick={onTokensOnly}
            >
              <Icon name="palette" size={14} />
              <span>Use only its tokens</span>
              <span className="ui-menu-meta">No dev server</span>
            </button>
          </div>
        </>
      )}
    </Pop>
  );
};

const FolderPathPop = ({
  trigger,
  isClosing,
  onClose,
  onPick,
}: {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly isClosing: boolean;
  readonly onClose: Close;
  readonly onPick: (path: string) => void;
}): ReactElement => {
  const [value, setValue] = useState("");

  const submit = (): void => {
    if (!value.trim()) {
      return;
    }

    onPick(value.trim());
    onClose(true);
  };

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      className="ui-menu home-path-pop"
      label="Add app folder"
    >
      <div className="ui-menu-section">
        <label className="ui-menu-label" htmlFor="home-app-path">
          Folder path
        </label>
        <input
          id="home-app-path"
          className="mono"
          value={value}
          placeholder={copy.codeMyApp}
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => keepEnter(e, submit)}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="home-app-note">
          The desktop app opens the macOS folder picker here, and you can drop a
          folder on the window.
        </p>
        <button
          type="button"
          className="btn small primary"
          disabled={!value.trim()}
          onClick={submit}
        >
          Add folder
        </button>
      </div>
    </Pop>
  );
};

export { AppMenu, FolderPathPop, openChip, runInProject };

export type { AppMenuProps };
