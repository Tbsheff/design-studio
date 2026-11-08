import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import { OkSchema } from "./schema.js";

const deletePackPack = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "delete_pack_pack",
    set: "design-system",
    short:
      "Delete a user design system from the studio library. A built-in pack cannot be deleted. The user must confirm.",
  },
  confirm: "user",
  description:
    "Delete a user design system from the studio library. Projects that use it keep their files. Its draft project is marked as deleted. Built-in packs cannot be deleted.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "DELETE", path: "/api/packs/:packId" },
  id: "pack.deletePack",
  input: Schema.Struct({
    packId: PackIdSchema,
  }),
  invalidates: ["pack.listSummary", "pack.list", "pack.getPack"],
  mcp: { name: "delete_pack_pack" },
  needs: "pack.write",
  output: OkSchema,
  scope: "org",
});

export { deletePackPack };
