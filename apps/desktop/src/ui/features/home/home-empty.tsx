import type { Starter } from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { FOUND_KIND_LABEL } from "../../../shared/found-apps.js";
import { api } from "../../api.js";
import { copy } from "./copy.js";
import type { FoundApp, FoundApps } from "./deps.js";
import { projectsApi } from "./projects-store-model.js";

const MAX_FOUND = 6;
const MAX_STARTERS = 4;
const KIND_TONE = { html: "html", next: "next", vite: "vite" } as const;

function foundBadge(app: FoundApp): string {
  const base = FOUND_KIND_LABEL[app.kind];

  return app.kind === "next" && app.apps.length > 1 ? `${base} monorepo` : base;
}

function useFound(): FoundApps | null | "error" {
  const [found, setFound] = useState<FoundApps | null | "error">(null);
  useEffect(() => {
    let live = true;
    projectsApi
      .found()
      .then((next) => live && setFound(next))
      .catch(() => live && setFound("error"));

    return (): void => {
      live = false;
    };
  }, []);

  return found;
}

const FoundList = ({
  onUse,
}: {
  readonly onUse: (path: string) => void;
}): ReactElement | null => {
  const found = useFound();

  if (found === "error") {
    return null;
  }

  const apps = found?.apps.slice(0, MAX_FOUND) ?? [];

  const roots = found
    ? found.roots
        .map((root) => shortenHome(root, found.home).replace(/^~\//u, ""))
        .join(", ")
    : "";

  return (
    <section className="home-found" aria-label={copy.foundOnThisMac}>
      <div className="home-found-head">
        <span>Found on this Mac</span>
        <span className="spacer" />
        <span className="home-found-roots truncate">{roots}</span>
      </div>
      {found === null && (
        <p className="home-found-note">Looking in your folders…</p>
      )}
      {found && apps.length === 0 && (
        <p className="home-found-note">
          No app folders found in {roots || "your home folder"}. Use Add app
          folder, or drop a folder on the window.
        </p>
      )}
      {apps.map((app) => (
        <div key={app.path} className="home-found-row">
          <span className="home-found-ic" aria-hidden="true">
            <Icon name="folder" size={14} />
          </span>
          <span className="home-found-name truncate">{app.name}</span>
          <span className="home-found-path truncate">
            {found ? shortenHome(app.path, found.home) : app.path}
          </span>
          <span className={`home-badge ${KIND_TONE[app.kind]}`}>
            {foundBadge(app)}
          </span>
          <button
            type="button"
            className="btn small"
            aria-label={`Use ${app.name}`}
            data-tip={copy.pickThisAppToDesign}
            onClick={() => onUse(app.path)}
          >
            Use
          </button>
        </div>
      ))}
    </section>
  );
};

const StartCards = ({
  isBusy,
  onSample,
  onStarter,
}: {
  readonly isBusy: boolean;
  readonly onSample: () => void;
  readonly onStarter: (starter: Starter) => void;
}): ReactElement => {
  const [starters, setStarters] = useState<Starter[]>([]);
  useEffect(() => {
    void api
      .starters()
      .then((list) => setStarters(list.slice(0, MAX_STARTERS)))
      .catch(() => null);
  }, []);

  return (
    <div className="home-start">
      <button
        type="button"
        className="home-start-card sample"
        disabled={isBusy}
        onClick={onSample}
      >
        <span className="home-start-thumb" aria-hidden="true">
          <Icon name="play" size={16} />
        </span>
        <span className="home-start-text">
          <b>Open the sample</b>
          <span>Click through a finished prototype. No cost.</span>
        </span>
      </button>
      <div className="home-start-card">
        <b>Or start from</b>
        <div className="home-start-pills">
          {starters.map((starter) => (
            <button
              key={starter.id}
              type="button"
              className="home-pill"
              disabled={isBusy}
              onClick={() => onStarter(starter)}
            >
              {starter.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function HomeEmpty({
  isBusy,
  onUse,
  onSample,
  onStarter,
}: {
  readonly isBusy: boolean;
  readonly onUse: (path: string) => void;
  readonly onSample: () => void;
  readonly onStarter: (starter: Starter) => void;
}): ReactElement {
  return (
    <div className="home-empty-state">
      <div className="home-empty-grid">
        <FoundList onUse={onUse} />
        <StartCards isBusy={isBusy} onSample={onSample} onStarter={onStarter} />
      </div>
      <p className="home-empty-note">
        “Use” picks the app. Return opens it in the studio, and your changes go
        to its files. Recent work shows here after your first project.
      </p>
    </div>
  );
}
