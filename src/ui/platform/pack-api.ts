import type { getDraftPacks } from "../../shared/actions/packs/get-draft.js";
import type { getPackPacks } from "../../shared/actions/packs/get-pack.js";
import type { inspectPackPacks } from "../../shared/actions/packs/inspect-pack.js";
import { routes } from "../../shared/actions/packs/routes.js";
import type {
  DesignSystemCheckResult,
  DesignSystemDraftInfo,
  PackDetail,
} from "../../shared/contracts";
import { call } from "./http";

const getPack = async (packId: string): Promise<PackDetail> =>
  (await call<typeof getPackPacks>(routes.getPackPacks, {
    packId,
  })) as PackDetail;

const checkPack = async (packId: string): Promise<DesignSystemCheckResult> =>
  (await call<typeof inspectPackPacks>(routes.inspectPackPacks, {
    packId,
  })) as DesignSystemCheckResult;

const getDesignSystemDraft = async (
  projectId: string
): Promise<DesignSystemDraftInfo> =>
  (await call<typeof getDraftPacks>(routes.getDraftPacks, {
    projectId,
  })) as DesignSystemDraftInfo;

const packApi = { checkPack, getDesignSystemDraft, getPack };

export { packApi };
