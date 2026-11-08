import { useEffect, useState } from "react";

import { json } from "../../api.js";

let profile: Promise<string | null> | null = null;

function initialOf(name: string | null): string | null {
  const first = name?.trim().match(/\p{L}|\p{N}/u)?.[0];

  return first ? first.toLocaleUpperCase() : null;
}

const getProfileInitial = async (): Promise<string | null> => {
  try {
    const result = await json<{ readonly name: string | null }>(
      "GET",
      "/api/profile"
    );

    return initialOf(result.name);
  } catch {
    return null;
  }
};

const useProfileInitial = (): string | null => {
  const [initial, setInitial] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;

    const apply = async (): Promise<void> => {
      profile ??= getProfileInitial();
      const value = await profile;

      if (alive) {
        setInitial(value);
      }
    };

    apply();

    return (): void => {
      alive = false;
    };
  }, []);

  return initial;
};

export { useProfileInitial };
