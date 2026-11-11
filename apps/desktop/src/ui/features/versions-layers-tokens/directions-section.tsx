import type { Project } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { DirectionList } from "./direction-list.js";
import { DirectionsHead } from "./directions-head.js";
import { ForkForm } from "./fork-form.js";
import type { ForkApi } from "./use-fork.js";
import type { VersionIndex } from "./version-labels.js";
import { hasDirectionList, toVersionTitle } from "./versions-panel-model.js";

interface DirectionsSectionProps {
  readonly directionId: string | null;
  readonly fork: ForkApi;
  readonly headVersionId: string | null;
  readonly index: VersionIndex;
  readonly onNewDirection: () => void;
  readonly onSelectDirection: (id: string) => void;
  readonly project: Project;
}

const DirectionsSection = (props: DirectionsSectionProps): ReactNode => {
  const { fork, headVersionId } = props;
  const { directions } = props.project;

  const {
    cancel: handleCancel,
    setName: handleName,
    submit: handleSubmit,
  } = fork;

  const form = fork.from && (
    <ForkForm
      fromTitle={toVersionTitle(fork.from, props.index)}
      name={fork.name}
      error={fork.error}
      onName={handleName}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
    />
  );

  if (!hasDirectionList(directions.length)) {
    if (!form) {
      return null;
    }

    return (
      <section
        className="panel-section dir-section"
        aria-label={COPY.directionNew}
      >
        {form}
      </section>
    );
  }

  return (
    <section
      className="panel-section dir-section"
      aria-labelledby="directions-heading"
    >
      <DirectionsHead
        count={directions.length}
        isDisabled={!headVersionId}
        onNew={props.onNewDirection}
      />
      <DirectionList
        directionId={props.directionId}
        directions={directions}
        onSelect={props.onSelectDirection}
      />
      {form}
    </section>
  );
};

export { DirectionsSection };
