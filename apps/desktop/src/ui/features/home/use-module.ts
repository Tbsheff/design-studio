import { useEffect, useState } from "react";

function useModule<T>(load: () => Promise<T>, enabled: boolean): T | null {
  const [mod, setMod] = useState<T | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let live = true;
    void load().then((loaded) => live && setMod(loaded));

    return () => {
      live = false;
    };
  }, [enabled, load]);

  return mod;
}

export { useModule };
