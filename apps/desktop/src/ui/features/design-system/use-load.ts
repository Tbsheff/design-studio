import { useEffect, useState } from "react";

import { errorText } from "../../api.js";

interface Load<Value> {
  readonly error: string | null;
  readonly value: Value | null;
}

interface Keyed<Value> {
  readonly key: string;
  readonly load: Load<Value>;
}

const useLoad = <Value>(
  read: () => Promise<Value>,
  key: string
): Load<Value> => {
  const [state, setState] = useState<Keyed<Value> | null>(null);

  useEffect(() => {
    let isLive = true;

    const run = async (): Promise<void> => {
      try {
        const value = await read();

        if (isLive) {
          setState({ key, load: { error: null, value } });
        }
      } catch (error) {
        if (isLive) {
          setState({ key, load: { error: errorText(error), value: null } });
        }
      }
    };

    run();

    return (): void => {
      isLive = false;
    };
  }, [key, read]);

  if (state?.key === key) {
    return state.load;
  }

  return { error: null, value: null };
};

export { useLoad };

export type { Load };
