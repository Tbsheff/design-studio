import type { Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { DirectionList } from "./direction-list.js";
import { DirectionsHead } from "./directions-head.js";
import { ForkForm } from "./fork-form.js";
import type { ForkApi } from "./use-fork.js";
import type { VersionIndex } from "./version-labels.js";
import { toVersionTitle } from "./versions-panel-model.js";

interface DirectionsSectionProps {
  readonly directionId: string | null;
  readonly fork: ForkApi;
  readonly headVersionId: string | null;
  readonly index: VersionIndex;
  readonly onSelectDirection: (id: string) => void;
  readonly project: Project;
}

const DirectionsSection = (props: DirectionsSectionProps): ReactNode => {
  const { fork, headVersionId } = props;

  const {
    cancel: handleCancel,
    setName: handleName,
    submit: handleSubmit,
  } = fork;

  const handleNewDirection = useCallback((): void => {
    if (headVersionId) {
      fork.start(headVersionId);
    }
  }, [fork, headVersionId]);

  return (
    <section
      className="panel-section dir-section"
      aria-labelledby="directions-heading"
    >
      <DirectionsHead
        count={props.project.directions.length}
        isDisabled={!headVersionId}
        onNew={handleNewDirection}
      />
      <DirectionList
        directionId={props.directionId}
        directions={props.project.directions}
        onSelect={props.onSelectDirection}
      />
      {fork.from && (
        <ForkForm
          fromTitle={toVersionTitle(fork.from, props.index)}
          name={fork.name}
          error={fork.error}
          onName={handleName}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
};

export { DirectionsSection };
