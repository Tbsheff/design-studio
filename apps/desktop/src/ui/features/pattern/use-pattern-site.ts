import { useCallback, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { copy } from "./copy.js";
import { patternRoutes, useAction } from "./deps.js";
import { SITE_WIDTH } from "./pattern-model.js";
import type { PatternCandidate } from "./pattern-model.js";
import { useSiteFields } from "./use-site-fields.js";
import { useSiteFind } from "./use-site-find.js";
import type { SiteFind } from "./use-site-find.js";

interface PatternSiteSetup {
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
}

interface PatternSite {
  readonly error: string | null;
  readonly find: SiteFind;
  readonly handleName: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSelect: (candidate: PatternCandidate) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleUrl: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly isImporting: boolean;
  readonly isReady: boolean;
  readonly name: string;
  readonly selector: string | null;
  readonly url: string;
}

const usePatternSite = (setup: PatternSiteSetup): PatternSite => {
  const { onClose, onDone, projectId: project } = setup;
  const fields = useSiteFields();
  const { handleName, handleSelect, handleUrl, name, selector, url } = fields;
  const [isImporting, startImport] = useTransition();
  const importer = useAction(patternRoutes.importPattern);
  const { run: runImport } = importer;

  const find = useSiteFind({
    onFound: fields.handleFound,
    projectId: project,
    url,
  });

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      const chosen = selector;

      if (chosen === null) {
        return;
      }

      startImport(async () => {
        const saved = await runImport({
          name: name.trim(),
          projectId: project,
          selector: chosen,
          url: url.trim(),
          width: SITE_WIDTH,
        });

        if (saved !== null) {
          onDone(copy.imported);
          onClose();
        }
      });
    },
    [name, onClose, onDone, project, runImport, selector, url]
  );

  const error = importer.error?.message ?? find.problem;
  const isReady = selector !== null && name.trim() !== "";

  return {
    error,
    find,
    handleName,
    handleSelect,
    handleSubmit,
    handleUrl,
    isImporting,
    isReady,
    name,
    selector,
    url,
  };
};

export { usePatternSite };

export type { PatternSite, PatternSiteSetup };
