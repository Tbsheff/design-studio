import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { openAppPanel } from "../../platform/app-status.js";
import { copy } from "./copy.js";
import { isAuthRoute } from "./frame-label-model.js";
import type { FrameRedirect } from "./frame-label-model.js";

const FrameRedirectNote = ({
  redirect,
  onSignIn,
  onDismiss,
}: {
  redirect: FrameRedirect;
  onSignIn: () => void;
  onDismiss: () => void;
}): ReactElement => {
  const auth = isAuthRoute(redirect.to);
  const pickRoute = useCallback(() => openAppPanel("routes"), []);

  let part2: "" | " Sign in, or pick a public route." = "";

  if (auth) {
    part2 = " Sign in, or pick a public route.";
  }

  const text = `${redirect.from} goes to ${redirect.to}.${part2}`;

  return (
    <output className="frame-redirect" data-tip={text}>
      <Icon name="alert" size={12} />
      <span className="frame-redirect-text">{text}</span>
      {auth && (
        <button type="button" className="btn ghost small" onClick={onSignIn}>
          {copy.signIn}
        </button>
      )}
      <button type="button" className="btn ghost small" onClick={pickRoute}>
        {copy.pickARoute}
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.dismiss}
        data-tip={copy.dismiss}
        onClick={onDismiss}
      >
        <Icon name="close" size={12} />
      </button>
    </output>
  );
};

export { FrameRedirectNote };
