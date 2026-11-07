import { Suspense } from "react";

import { HomeToast, type HomeToastState } from "./home-sections.js";
import { HomeDoctor, HomeTrash } from "./lazy-parts.js";
import { useDoctorGate } from "./use-doctor-gate.js";

function HomeOverlays({
  trashOpen,
  onCloseTrash,
  onRestored,
  doctor,
  toast,
  onToastDone,
}: {
  readonly trashOpen: boolean;
  readonly onCloseTrash: () => void;
  readonly onRestored: () => void;
  readonly doctor: ReturnType<typeof useDoctorGate>;
  readonly toast: HomeToastState | null;
  readonly onToastDone: () => void;
}) {
  const gate = doctor.gate;

  return (
    <>
      {trashOpen && (
        <Suspense fallback={null}>
          <HomeTrash onClose={onCloseTrash} onRestored={onRestored} />
        </Suspense>
      )}
      {gate && (
        <Suspense fallback={null}>
          <HomeDoctor
            problem={gate.problem}
            checking={gate.checking}
            onCheck={() => void doctor.check()}
            onOpenAnyway={() => {
              doctor.close();
              gate.proceed();
            }}
            onClose={doctor.close}
          />
        </Suspense>
      )}
      <HomeToast toast={toast} onDone={onToastDone} />
    </>
  );
}

export { HomeOverlays };
