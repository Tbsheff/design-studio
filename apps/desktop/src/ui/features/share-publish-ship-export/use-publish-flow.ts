import { useCallback, useState } from "react";

import type { Publication, PublishPlan } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { publishApi } from "./publish-api.js";
import type { PublishRequest } from "./publish-api.js";
import type { PublishTarget } from "./publish-types.js";
import { usePublications } from "./use-publications.js";
import type { Publications } from "./use-publications.js";
import { usePublishAct } from "./use-publish-act.js";

interface PublishFlow {
  readonly busy: string | null;
  readonly plan: PublishPlan | null;
  readonly done: Publication | null;
  readonly failure: string | null;
  readonly pubs: Publications;
  readonly check: (input: PublishRequest) => void;
  readonly confirm: () => void;
  readonly unpublish: (publication: Publication) => void;
  readonly rollback: (publication: Publication, versionId: string) => void;
  readonly clearPlan: () => void;
}

const usePublishFlow = (target: PublishTarget): PublishFlow => {
  const pubs = usePublications(target.projectId);
  const [plan, setPlan] = useState<PublishPlan | null>(null);
  const [asked, setAsked] = useState<PublishRequest | null>(null);
  const [done, setDone] = useState<Publication | null>(null);
  const { act, busy, fail, failure } = usePublishAct();
  const { projectId } = target;
  const { reload } = pubs;

  const check = useCallback(
    (input: PublishRequest): void => {
      act(copy.checking, async () => {
        setPlan(await publishApi.plan(projectId, input));
        setAsked(input);
      });
    },
    [act, projectId]
  );

  const confirm = useCallback((): void => {
    act(copy.publishingBusy, async () => {
      if (!plan || !asked) {
        return;
      }

      const made = await publishApi.publish(projectId, asked);
      setPlan(null);
      setDone(made.publication);
      await reload();

      if (made.publication.status !== "live") {
        fail(made.publication.error ?? copy.publishFailed);
      }
    });
  }, [act, asked, fail, plan, projectId, reload]);

  const unpublish = useCallback(
    (publication: Publication): void => {
      act(copy.unpublishing, async () => {
        await publishApi.unpublish(projectId, publication.id);
        await reload();
      });
    },
    [act, projectId, reload]
  );

  const rollback = useCallback(
    (publication: Publication, versionId: string): void => {
      act(copy.rollingBack, async () => {
        await publishApi.rollback(projectId, publication.id, versionId);
        await reload();
      });
    },
    [act, projectId, reload]
  );

  const clearPlan = useCallback((): void => {
    setPlan(null);
  }, []);

  return {
    busy,
    check,
    clearPlan,
    confirm,
    done,
    failure,
    plan,
    pubs,
    rollback,
    unpublish,
  };
};

export { usePublishFlow };

export type { PublishFlow };
