import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { FrameLabel } from "./frame-label.js";
import { ShareExpiryPicker } from "./share-expiry-picker.js";
import { ShareFrameList } from "./share-frame-list.js";
import { ShareLanSwitch } from "./share-lan-switch.js";
import { ShareLinkList } from "./share-link-list.js";
import { ShareLiveRow } from "./share-live-row.js";
import type { ShareCopied, ShareState } from "./share-types.js";
import type { ShareForm } from "./use-share-form.js";

interface ShareFormBodyProps {
  readonly form: ShareForm;
  readonly shares: ShareState;
  readonly copied: ShareCopied;
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly now: number;
  readonly onRevoke: (id: string) => void;
  readonly onCursor: (id: string, isOn: boolean) => void;
  readonly onLan: (isOn: boolean) => void;
}

const ShareFormBody = ({
  copied,
  form,
  labels,
  now,
  onCursor,
  onLan,
  onRevoke,
  shares,
}: ShareFormBodyProps): ReactElement => {
  const { onExpiry, onLiveView, onToggle } = form;

  return (
    <div className="modal-body share-body">
      <ShareFrameList
        frames={form.frames}
        picked={form.picked}
        labels={labels}
        onToggle={onToggle}
      />
      <div className="export-field">
        <span className="export-label">{copy.linkEndsAfter}</span>
        <ShareExpiryPicker value={form.expiry} onChange={onExpiry} />
      </div>
      <ShareLiveRow
        isOn={form.isLiveView}
        isBusy={shares.isBusy}
        onChange={onLiveView}
      />
      {!form.hasVersion && (
        <p className="share-link-note">{copy.saveAVersionFirst}</p>
      )}
      {shares.error && (
        <div className="alert error small" role="alert">
          {shares.error}
        </div>
      )}
      <ShareLinkList
        links={form.shown}
        server={shares.server}
        now={now}
        isBusy={shares.isBusy}
        copied={copied.id}
        onRevoke={onRevoke}
        onCursor={onCursor}
      />
      <ShareLanSwitch
        server={shares.server}
        hasLive={form.hasLive}
        isBusy={shares.isBusy}
        onChange={onLan}
      />
    </div>
  );
};

export { ShareFormBody };
