import { useCallback, useState, useTransition } from "react";

import {
  call,
  errorText,
  fixtureRoutes,
  projectRoutes,
  runRoutes,
} from "./deps.js";
import type { FixtureOffer } from "./fixture-offer-model.js";
import { toOpenPrompt } from "./fixture-offer-model.js";

interface FixtureOfferState {
  readonly failure: string | null;
  readonly handleMake: () => void;
  readonly handleOpen: () => void;
  readonly isPending: boolean;
}

const useFixtureOffer = (
  offer: FixtureOffer,
  promptText: string,
  onCreated: (projectId: string) => void
): FixtureOfferState => {
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMake = useCallback((): void => {
    startTransition(async (): Promise<void> => {
      try {
        const fixture = await call(fixtureRoutes.createFixture, {
          directionId: null,
          params: {},
          projectId: offer.appProjectId,
          route: offer.route,
          searchParams: {},
          shell: "inherit",
        });

        const created = await call(projectRoutes.createPrototypeProject, {
          intoProjectId: offer.copyProjectId,
          level: null,
          name: null,
          projectId: offer.appProjectId,
          prompt: promptText,
          routePath: fixture.route,
          shouldStartRun: true,
          viewport: null,
        });

        onCreated(created.project.id);
      } catch (error: unknown) {
        setFailure(errorText(error));
      }
    });
  }, [offer, onCreated, promptText]);

  const handleOpen = useCallback((): void => {
    startTransition(async (): Promise<void> => {
      try {
        await call(runRoutes.startRun, {
          directionId: offer.copyDirectionId,
          mode: "edit",
          projectId: offer.copyProjectId,
          prompt: toOpenPrompt(offer, promptText),
        });

        onCreated(offer.copyProjectId);
      } catch (error: unknown) {
        setFailure(errorText(error));
      }
    });
  }, [offer, onCreated, promptText]);

  return { failure, handleMake, handleOpen, isPending };
};

export { useFixtureOffer };

export type { FixtureOfferState };
