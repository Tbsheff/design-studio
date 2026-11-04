import { Suspense } from "react";
import type { ReactElement } from "react";

import { AccountMenu } from "../../features/account/index.js";
import { copy } from "./copy.js";

const AppBarAccount = (): ReactElement => (
  <div className="app-bar-account" data-tip={copy.accountTip}>
    <Suspense fallback={null}>
      <AccountMenu />
    </Suspense>
  </div>
);

export { AppBarAccount };
