import { useState } from "react";
import type { ReactElement } from "react";

import { AttentionPanel } from "./attention-panel.js";
import { copy } from "./copy.js";
import type { CritiqueTab } from "./critique-model.js";
import { CritiqueScoresPanel } from "./critique-scores-panel.js";
import { CritiqueTabs } from "./critique-tabs.js";

interface PanelProps {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly onSelect: (selector: string) => void;
  readonly projectId: string;
}

const CritiquePanel = (props: PanelProps): ReactElement => {
  const [tab, setTab] = useState<CritiqueTab>("scores");

  return (
    <section aria-label={copy.title} className="review-group">
      <CritiqueTabs onSelect={setTab} tab={tab} />
      {tab === "attention" && (
        <AttentionPanel
          directionId={props.directionId}
          frameId={props.frameId}
          isLive={props.isLive}
          onSelect={props.onSelect}
          projectId={props.projectId}
        />
      )}
      {tab === "scores" && (
        <CritiqueScoresPanel
          directionId={props.directionId}
          frameId={props.frameId}
          isLive={props.isLive}
          onSelect={props.onSelect}
          projectId={props.projectId}
        />
      )}
    </section>
  );
};

export { CritiquePanel };

export type { PanelProps };
