import { useEffect, useState } from "react";

const PATH_DELAY_MS = 250;

const useDebouncedPath = (path: string): string => {
  const [settled, setSettled] = useState(path);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(path), PATH_DELAY_MS);

    return (): void => clearTimeout(timer);
  }, [path]);

  return settled;
};

export { useDebouncedPath };
