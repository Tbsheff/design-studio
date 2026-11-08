import type {
  PublishExpiryDays,
  PublishKind,
} from "../../../shared/publish.js";

interface PublishTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
  kind: PublishKind;
}

interface PublishFormState {
  readonly picked: ReadonlySet<string>;
  readonly isPasswordOn: boolean;
  readonly password: string;
  readonly expiry: PublishExpiryDays;
  readonly hasComments: boolean;
  readonly hasViewerComments: boolean;
  readonly isIndexable: boolean;
}

type PublishFormPatch = Partial<PublishFormState>;

export type { PublishFormPatch, PublishFormState, PublishTarget };
