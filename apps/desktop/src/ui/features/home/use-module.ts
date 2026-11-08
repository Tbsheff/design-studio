import { useEffect, useState } from "react";

function useModule<Value>(
  load: () => Promise<Value>,
  enabled: boolean
): Value | null {
  const [mod, setMod] = useState<Value | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let live = true;
    void load().then((loaded) => live && setMod(loaded));

    return (): void => {
      live = false;
    };
  }, [enabled, load]);

  return mod;
}

export { useModule };
