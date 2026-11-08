import { lazy } from "react";

const AccountButton = lazy(async () => {
  const loaded = await import("./account-button.js");

  return { default: loaded.AccountButton };
});

const AccountMenu = lazy(async () => {
  const loaded = await import("./account-menu.js");

  return { default: loaded.AccountMenu };
});

const SignedInConfirm = lazy(async () => {
  const loaded = await import("./signed-in-confirm.js");

  return { default: loaded.SignedInConfirm };
});

export { AccountButton, AccountMenu, SignedInConfirm };
