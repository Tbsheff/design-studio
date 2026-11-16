import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import type { FrameChoice } from "./export-api.js";
import type { FrameLabel } from "./frame-label.js";
import { PublishExpiryPicker } from "./publish-expiry-picker.js";
import { PublishFramePicker } from "./publish-frame-picker.js";
import { PublishPasswordField } from "./publish-password-field.js";
import { PublishSwitchRow } from "./publish-switch-row.js";
import type {
  PublishFormPatch,
  PublishFormState,
  PublishTarget,
} from "./publish-types.js";
import { usePublishFormSetters } from "./use-publish-form-setters.js";

interface PublishFormProps {
  readonly target: PublishTarget;
  readonly form: PublishFormState;
  readonly frames: readonly FrameChoice[];
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly onPatch: (patch: PublishFormPatch) => void;
  readonly onToggle: (id: string) => void;
}

const PublishForm = ({
  form,
  frames,
  labels,
  onPatch,
  onToggle,
  target,
}: PublishFormProps): ReactElement => {
  const {
    setComments,
    setExpiry,
    setIndexable,
    setPassword,
    setPasswordOn,
    setViewerComments,
  } = usePublishFormSetters(onPatch);

  return (
    <div className="publish-form">
      {target.kind === "site" && (
        <p className="publish-step-text">{copy.everyPageOfThe}</p>
      )}
      {target.kind !== "site" && (
        <PublishFramePicker
          frames={frames}
          labels={labels}
          picked={form.picked}
          onToggle={onToggle}
        />
      )}
      <PublishSwitchRow
        title={copy.password}
        help={pick(
          form.isPasswordOn,
          copy.passwordOnHelp,
          copy.passwordOffHelp
        )}
        isOn={form.isPasswordOn}
        onChange={setPasswordOn}
      />
      {form.isPasswordOn && (
        <PublishPasswordField value={form.password} onValue={setPassword} />
      )}
      <PublishExpiryPicker value={form.expiry} onChange={setExpiry} />
      {target.kind === "viewer" && (
        <PublishSwitchRow
          title={copy.showOpenComments}
          help={pick(
            form.hasComments,
            copy.commentsOnHelp,
            copy.commentsOffHelp
          )}
          isOn={form.hasComments}
          onChange={setComments}
        />
      )}
      <PublishSwitchRow
        title={copy.viewerComments}
        help={pick(
          form.hasViewerComments,
          copy.viewerCommentsOnHelp,
          copy.viewerCommentsOffHelp
        )}
        isOn={form.hasViewerComments}
        onChange={setViewerComments}
      />
      <PublishSwitchRow
        title={copy.searchEngines}
        help={pick(form.isIndexable, copy.indexOnHelp, copy.indexOffHelp)}
        isOn={form.isIndexable}
        onChange={setIndexable}
      />
    </div>
  );
};

export { PublishForm };
