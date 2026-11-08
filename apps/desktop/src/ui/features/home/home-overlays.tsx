import { Suspense, useCallback } from "react";
import type { ReactElement } from "react";

import { HomeToast } from "./home-sections.js";
import type { HomeToastState } from "./home-sections.js";
import { HomeDoctor, HomeTrash } from "./lazy-parts.js";
import type { useDoctorGate } from "./use-doctor-gate.js";

const HomeOverlays = ({
  isTrashOpen,
  onCloseTrash,
  onRestored,
  doctor,
  toast,
  onToastDone,
}: {
  readonly isTrashOpen: boolean;
  readonly onCloseTrash: () => void;
  readonly onRestored: () => void;
  readonly doctor: ReturnType<typeof useDoctorGate>;
  readonly toast: HomeToastState | null;
  readonly onToastDone: () => void;
}): ReactElement => {
  const { gate, check, close } = doctor;

  const handleCheck = useCallback((): void => {
    check();
  }, [check]);

  const handleOpenAnyway = useCallback((): void => {
    close();
    gate?.proceed();
  }, [close, gate]);

  return (
    <>
      {isTrashOpen && (
        <Suspense fallback={null}>
          <HomeTrash onClose={onCloseTrash} onRestored={onRestored} />
        </Suspense>
      )}
      {gate && (
        <Suspense fallback={null}>
          <HomeDoctor
            problem={gate.problem}
            isChecking={gate.isChecking}
            onCheck={handleCheck}
            onOpenAnyway={handleOpenAnyway}
            onClose={close}
          />
        </Suspense>
      )}
      <HomeToast toast={toast} onDone={onToastDone} />
    </>
  );
};

export { HomeOverlays };
