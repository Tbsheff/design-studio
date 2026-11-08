import { shortenHome } from "@design-studio/contracts/folders";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { FOUND_KIND_LABEL } from "../../../shared/found-apps.js";
import { copy } from "./copy.js";
import type { FoundApp } from "./deps.js";

const KIND_TONE = { html: "html", next: "next", vite: "vite" } as const;

const getFoundBadge = (app: FoundApp): string => {
  const base = FOUND_KIND_LABEL[app.kind];

  if (app.kind === "next" && app.apps.length > 1) {
    return `${base} monorepo`;
  }

  return base;
};

const toShownPath = (path: string, home: string | null): string => {
  if (home === null) {
    return path;
  }

  return shortenHome(path, home);
};

const FoundRow = ({
  app,
  home,
  onUse,
}: {
  readonly app: FoundApp;
  readonly home: string | null;
  readonly onUse: (path: string) => void;
}): ReactElement => {
  const handleUse = useCallback((): void => {
    onUse(app.path);
  }, [app.path, onUse]);

  return (
    <div className="home-found-row">
      <span className="home-found-ic" aria-hidden="true">
        <Icon name="folder" size={14} />
      </span>
      <span className="home-found-name truncate">{app.name}</span>
      <span className="home-found-path truncate">
        {toShownPath(app.path, home)}
      </span>
      <span className={`home-badge ${KIND_TONE[app.kind]}`}>
        {getFoundBadge(app)}
      </span>
      <button
        type="button"
        className="btn small"
        aria-label={`Use ${app.name}`}
        data-tip={copy.pickThisAppToDesign}
        onClick={handleUse}
      >
        {copy.labelUse}
      </button>
    </div>
  );
};

export { FoundRow };
