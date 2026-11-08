import type { ReactElement } from "react";

import { findPack, usePacks } from "../design-system/packs.js";
import { DraftBody } from "./draft-body.js";
import type { DraftBodyProps } from "./draft-body.js";

type DraftBarProps = Omit<DraftBodyProps, "packId" | "packName">;

const DraftBar = ({
  project,
  state,
  lastChange,
  onSave,
  lastRun,
  reading,
  running,
}: DraftBarProps): ReactElement | null => {
  const packId = project.designSystemFor ?? null;
  const { packs } = usePacks();

  if (!packId) {
    return null;
  }

  return (
    <DraftBody
      packId={packId}
      packName={findPack(packs, packId)?.name ?? null}
      project={project}
      state={state}
      lastChange={lastChange}
      onSave={onSave}
      lastRun={lastRun}
      reading={reading}
      running={running}
    />
  );
};

export { DraftBar };

export type { DraftBarProps };
