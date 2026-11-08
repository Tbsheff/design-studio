import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";

import { toCandidateName } from "./pattern-model.js";
import type { PatternCandidate } from "./pattern-model.js";

interface SiteFields {
  readonly handleFound: () => void;
  readonly handleName: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSelect: (candidate: PatternCandidate) => void;
  readonly handleUrl: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly name: string;
  readonly selector: string | null;
  readonly url: string;
}

const useSiteFields = (): SiteFields => {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [selector, setSelector] = useState<string | null>(null);

  const handleFound = useCallback((): void => setSelector(null), []);

  const handleUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setUrl(event.target.value),
    []
  );

  const handleName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setName(event.target.value),
    []
  );

  const handleSelect = useCallback((candidate: PatternCandidate): void => {
    setSelector(candidate.selector);
    setName((current) => {
      if (current.trim() === "") {
        return toCandidateName(candidate);
      }

      return current;
    });
  }, []);

  return {
    handleFound,
    handleName,
    handleSelect,
    handleUrl,
    name,
    selector,
    url,
  };
};

export { useSiteFields };

export type { SiteFields };
