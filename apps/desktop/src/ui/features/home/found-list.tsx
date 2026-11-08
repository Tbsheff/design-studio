import { shortenHome } from "@design-studio/contracts/folders";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { FoundApps } from "./deps.js";
import { FoundRow } from "./found-row.js";
import { useFound } from "./use-found.js";

const MAX_FOUND = 6;

const toRootsLabel = (found: FoundApps | null): string => {
  if (found === null) {
    return "";
  }

  return found.roots
    .map((root) => shortenHome(root, found.home).replace(/^~\//u, ""))
    .join(", ");
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
  const roots = toRootsLabel(found);

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
        <FoundRow
          key={app.path}
          app={app}
          home={found?.home ?? null}
          onUse={onUse}
        />
      ))}
    </section>
  );
};

export { FoundList };
