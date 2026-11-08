import { useEffect, useState } from "react";

const useModule = <Value>(
  load: () => Promise<Value>,
  enabled: boolean
): Value | null => {
  const [mod, setMod] = useState<Value | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let live = true;

    const run = async (): Promise<void> => {
      const loaded = await load();

      if (live) {
        setMod(loaded);
      }
    };

    run();

    return (): void => {
      live = false;
    };
  }, [enabled, load]);

  return mod;
};

export { useModule };
