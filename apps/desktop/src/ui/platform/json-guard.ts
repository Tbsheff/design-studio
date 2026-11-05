import type {
  ActionDone,
  StreamHello,
} from "@design-studio/actions/app-stream";
import type { StudioEvent } from "@design-studio/contracts";
import type { McpApprovalPoll } from "@design-studio/contracts/export";

const isText = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number";

const isFlag = (value: unknown): value is boolean => typeof value === "boolean";

const isTextOrNull = (value: unknown): value is string | null =>
  value === null || isText(value);

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => isText(item));

const isList = (value: unknown): value is unknown[] => Array.isArray(value);

const isStudioEvent = (value: unknown): value is StudioEvent => {
  if (!(value instanceof Object) || Array.isArray(value)) {
    return false;
  }

  const fields = new Map(Object.entries(value));

  return (
    isText(fields.get("projectId")) &&
    isNumber(fields.get("seq")) &&
    isText(fields.get("type"))
  );
};

const isStreamHello = (value: unknown): value is StreamHello => {
  if (!(value instanceof Object) || Array.isArray(value)) {
    return false;
  }

  return isText(new Map(Object.entries(value)).get("sid"));
};

const isApprovalPoll = (value: unknown): value is McpApprovalPoll => {
  if (!(value instanceof Object) || Array.isArray(value)) {
    return false;
  }

  const fields = new Map(Object.entries(value));

  return isFlag(fields.get("edits")) && isList(fields.get("pending"));
};

const isActionDone = (value: unknown): value is ActionDone => {
  if (!(value instanceof Object) || Array.isArray(value)) {
    return false;
  }

  const fields = new Map(Object.entries(value));

  return (
    isText(fields.get("actionId")) &&
    isTextList(fields.get("invalidates")) &&
    isTextOrNull(fields.get("projectId"))
  );
};

export { isActionDone, isApprovalPoll, isStreamHello, isStudioEvent, isText };
