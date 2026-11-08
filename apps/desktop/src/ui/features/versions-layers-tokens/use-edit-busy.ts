import { useCallback, useMemo, useRef, useState } from "react";

interface EditBusy {
  readonly claimBusy: () => void;
  readonly isBusy: () => boolean;
  readonly isInflight: boolean;
  readonly releaseBusy: () => void;
}

const useEditBusy = (): EditBusy => {
  const [isInflight, setIsInflight] = useState(false);
  const busyRef = useRef(false);

  const isBusy = useCallback((): boolean => busyRef.current, []);

  const claimBusy = useCallback((): void => {
    busyRef.current = true;
    setIsInflight(true);
  }, []);

  const releaseBusy = useCallback((): void => {
    busyRef.current = false;
    setIsInflight(false);
  }, []);

  return useMemo(
    () => ({ claimBusy, isBusy, isInflight, releaseBusy }),
    [claimBusy, isBusy, isInflight, releaseBusy]
  );
};

export { useEditBusy };

export type { EditBusy };
