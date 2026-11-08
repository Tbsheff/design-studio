import { toButton, toCard, toField, toNode } from "./node.js";
import type { BlockChild, BlockTemplate } from "./types.js";

const toFooter = (cancel: string, save: string): BlockChild[] => [
  toButton("outline", cancel),
  toButton(null, save),
];

const toSettingsForm = (): BlockTemplate["root"] =>
  toCard({
    className: "max-w-2xl",
    content: [
      toNode("form", { className: "flex flex-col gap-4" }, [
        toField(
          "workspace-name",
          "Workspace name",
          { defaultValue: "Northwind Studio", name: "name" },
          ""
        ),
        toField(
          "workspace-email",
          "Billing email",
          {
            defaultValue: "billing@northwind.co",
            name: "email",
            type: "email",
          },
          ""
        ),
        toField(
          "workspace-url",
          "Workspace URL",
          { defaultValue: "northwind", name: "url" },
          ""
        ),
      ]),
    ],
    contentClass: "",
    description: "Change the name and contact details of your workspace.",
    footer: toFooter("Cancel", "Save changes"),
    title: "Workspace settings",
  });

const toProfileForm = (): BlockTemplate["root"] =>
  toCard({
    className: "max-w-3xl",
    content: [
      toNode("form", { className: "grid gap-4 sm:grid-cols-2" }, [
        toField(
          "profile-first",
          "First name",
          { defaultValue: "Avery", name: "first" },
          ""
        ),
        toField(
          "profile-last",
          "Last name",
          { defaultValue: "Chen", name: "last" },
          ""
        ),
        toField(
          "profile-email",
          "Email",
          {
            defaultValue: "avery@northwind.co",
            name: "email",
            type: "email",
          },
          "sm:col-span-2"
        ),
        toField(
          "profile-role",
          "Job title",
          { defaultValue: "Product designer", name: "role" },
          "sm:col-span-2"
        ),
      ]),
    ],
    contentClass: "",
    description: "This is how other people see you.",
    footer: toFooter("Discard", "Update profile"),
    title: "Edit profile",
  });

const FORM_TEMPLATES: readonly BlockTemplate[] = [
  {
    description:
      "A settings card with three labeled fields and cancel and save buttons.",
    entity: null,
    id: "form-settings",
    kind: "form",
    name: "Settings form",
    root: toSettingsForm(),
  },
  {
    description:
      "A two-column profile card with name, email and job title fields.",
    entity: null,
    id: "form-profile",
    kind: "form",
    name: "Profile form",
    root: toProfileForm(),
  },
];

export { FORM_TEMPLATES };
