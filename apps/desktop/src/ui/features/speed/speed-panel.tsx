import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SpeedHead } from "./speed-head.js";
import { SpeedImages } from "./speed-images.js";
import type { SpeedView } from "./speed-model.js";
import { SpeedRow } from "./speed-row.js";
import { useSpeed } from "./use-speed.js";

interface SpeedPanelProps {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly projectId: string;
}

const NO_IMAGES: SpeedView["images"] = [];

const SpeedPanel = ({
  directionId,
  frameId,
  isLive,
  projectId,
}: SpeedPanelProps): ReactElement => {
  const speed = useSpeed({ directionId, frameId, projectId });
  const { view } = speed;
  const rows = view?.numbers ?? [];
  const images = view?.images ?? NO_IMAGES;

  return (
    <section aria-label={copy.title} className="review-group">
      <SpeedHead
        canCompare={view?.hasBaseline === true}
        isBusy={speed.isBusy}
        isLive={isLive}
        onBaseline={speed.handleBaseline}
        onCompare={speed.handleCompare}
      />
      {speed.error !== null && <div className="alert error">{speed.error}</div>}
      {speed.isBusy && (
        <div className="review-wait">
          <span className="spinner" />
          {copy.measuring}
        </div>
      )}
      {view?.isDevBuild === true && (
        <div className="alert">{copy.devBuild}</div>
      )}
      {rows.length === 0 && !speed.isBusy && (
        <div className="review-wait">{copy.empty}</div>
      )}
      <ul className="review-list">
        {rows.map((row) => (
          <SpeedRow key={row.key} row={row} />
        ))}
      </ul>
      <SpeedImages images={images} />
    </section>
  );
};

export { SpeedPanel };

export type { SpeedPanelProps };
