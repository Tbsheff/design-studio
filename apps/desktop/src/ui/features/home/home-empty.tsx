import type { Starter } from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import { Icon } from "@design-studio/ui";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { FOUND_KIND_LABEL } from "../../../shared/found-apps.js";
import { api } from "../../api.js";
import { copy } from "./copy.js";
import type { FoundApp, FoundApps } from "./deps.js";
import { projectsApi } from "./projects-store-model.js";

const MAX_FOUND = 6;
const MAX_STARTERS = 4;
const KIND_TONE = { html: "html", next: "next", vite: "vite" } as const;

const getFoundBadge = (app: FoundApp): string => {
  const base = FOUND_KIND_LABEL[app.kind];

  if (app.kind === "next" && app.apps.length > 1) {
    return `${base} monorepo`;
  }

  return base;
};

const useFound = (): FoundApps | null | "error" => {
  const [found, setFound] = useState<FoundApps | null | "error">(null);
  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const next = await projectsApi.found();

        if (live) {
          setFound(next);
        }
      } catch {
        if (live) {
          setFound("error");
        }
      }
    };

    load();

    return (): void => {
      live = false;
    };
  }, []);

  return found;
};

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
        <span>{copy.foundOnThisMac}</span>
        <span className="spacer" />
        <span className="home-found-roots truncate">{roots}</span>
      </div>
      {found === null && (
        <p className="home-found-note">{copy.lookingInYourFolders}</p>
      )}
      {found && apps.length === 0 && (
        <p className="home-found-note">
          {copy.noAppFoldersFoundIn}
          {roots || "your home folder"}
          {copy.labelUseAddAppFolderOr}
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
            {getFoundBadge(app)}
          </span>
          <button
            type="button"
            className="btn small"
            aria-label={`Use ${app.name}`}
            data-tip={copy.pickThisAppToDesign}
            onClick={() => onUse(app.path)}
          >
            {copy.labelUse}
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
    const load = async (): Promise<void> => {
      try {
        const list = await api.starters();
        setStarters(list.slice(0, MAX_STARTERS));
      } catch {
        setStarters([]);
      }
    };

    load();
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
          <b>{copy.openTheSample}</b>
          <span>{copy.clickThroughAFinishedPrototype}</span>
        </span>
      </button>
      <div className="home-start-card">
        <b>{copy.orStartFrom}</b>
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
      <p className="home-empty-note">{copy.labelUsePicksTheAppReturn}</p>
    </div>
  );
}
