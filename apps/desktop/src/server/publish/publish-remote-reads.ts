import type {
  RemoteComment,
  RemotePublication,
} from "@design-studio/actions/publish-remote";
import type { PublicationList } from "@design-studio/actions/publish/schema";
import type { PublishCore } from "./publish-core.js";
import { remoteClient } from "./remote.js";
import { mergeRemote } from "./service.js";
import { toPublication } from "./store.js";
import type { PublicationRecord } from "./store.js";

const listMerged = async (
  core: PublishCore,
  projectId: string,
  records: readonly PublicationRecord[]
): Promise<PublicationList> => {
  const endpoint = await core.backend.endpoint();
  const reply = await remoteClient(endpoint).list(projectId);

  const remote = new Map<string, RemotePublication>(
    reply.publications.map((entry) => [entry.id, entry])
  );

  const merged = records.map((record) => {
    const found = remote.get(record.id);

    if (record.backend === "app" && found) {
      return mergeRemote(record, found, endpoint.url);
    }

    return record;
  });

  return {
    backendError: null,
    publications: merged.map((record) => toPublication(record)),
  };
};

const listRemoteComments = async (
  core: PublishCore,
  publicationId: string
): Promise<{ comments: RemoteComment[] }> =>
  remoteClient(await core.backend.endpoint()).comments(publicationId);

export { listMerged, listRemoteComments };
