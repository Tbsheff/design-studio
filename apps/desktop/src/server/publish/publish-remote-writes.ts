import type { PublishInput } from "@design-studio/actions/publish/schema";
import type { Publication } from "../../shared/publish.js";
import { planFor, takePlan } from "./legacy-link.js";
import type { LegacyLink } from "./legacy-link.js";
import { toPlanInput } from "./plan-input.js";
import type { PublishCore } from "./publish-core.js";
import { remoteClient } from "./remote.js";
import { mergeRemote } from "./service.js";
import type { PublicationRecord } from "./store.js";

const revokeRemote = async (
  core: PublishCore,
  found: PublicationRecord
): Promise<PublicationRecord> => {
  const endpoint = await core.backend.endpoint();
  const out = await remoteClient(endpoint).revoke(found.id);

  return core.files.put({
    ...mergeRemote(found, out.publication, endpoint.url),
    hashes: [],
    status: "removed",
    updatedAt: Date.now(),
  });
};

const deleteRemoteComment = async (
  core: PublishCore,
  publicationId: string,
  commentId: string
): Promise<{ deleted: string }> =>
  remoteClient(await core.backend.endpoint()).deleteComment(
    publicationId,
    commentId
  );

const publishLegacy = async (
  link: LegacyLink,
  input: PublishInput
): Promise<Publication> => {
  const planInput = await toPlanInput(link, input);
  const held = await planFor(link, input.projectId, planInput);

  takePlan(link, input.projectId, planInput);

  return link.service.publish(input.projectId, held.id);
};

const rollbackRemote = async (
  core: PublishCore,
  found: PublicationRecord,
  versionId: string
): Promise<PublicationRecord> => {
  const endpoint = await core.backend.endpoint();
  const next = await remoteClient(endpoint).rollback(found.id, versionId);

  return core.files.put({
    ...mergeRemote(found, next, endpoint.url),
    updatedAt: Date.now(),
  });
};

export { deleteRemoteComment, publishLegacy, revokeRemote, rollbackRemote };
