import type { DoctorCause } from "@design-studio/contracts/app-doctor";
import { Suspense } from "react";
import type { ReactElement } from "react";

import { DoctorCard } from "../../features/design-system/index.js";

interface AppBarDoctorProps {
  readonly cause: DoctorCause;
  readonly isManaged: boolean;
  readonly onClose: () => void;
  readonly onFixed: () => void;
  readonly onLog: () => void;
  readonly onRestart: () => void;
  readonly projectId: string;
}

const AppBarDoctor = ({
  cause,
  isManaged,
  onClose,
  onFixed,
  onLog,
  onRestart,
  projectId,
}: AppBarDoctorProps): ReactElement => {
  if (isManaged) {
    return (
      <Suspense fallback={null}>
        <DoctorCard
          projectId={projectId}
          cause={cause}
          onFixed={onFixed}
          onLog={onLog}
          onClose={onClose}
          onRestart={onRestart}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <DoctorCard
        projectId={projectId}
        cause={cause}
        onFixed={onFixed}
        onLog={onLog}
        onClose={onClose}
      />
    </Suspense>
  );
};

export { AppBarDoctor };
