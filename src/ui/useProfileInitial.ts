import { useEffect, useState } from 'react';
import { json } from './api';

let profile: Promise<string | null> | null = null;

function initialOf(name: string | null): string | null {
  const first = name?.trim().match(/\p{L}|\p{N}/u)?.[0];
  return first ? first.toLocaleUpperCase() : null;
}

export function useProfileInitial(): string | null {
  const [initial, setInitial] = useState<string | null>(null);
  useEffect(() => {
    profile ??= json<{ name: string | null }>('GET', '/api/profile').then(
      (result) => initialOf(result.name),
      () => null,
    );
    let alive = true;
    void profile.then((value) => alive && setInitial(value));
    return () => {
      alive = false;
    };
  }, []);
  return initial;
}
