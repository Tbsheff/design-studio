import { ApiError } from "../../api.js";
import { isText } from "../../platform/json-guard.js";
import { toErrorText } from "./error-text.js";

const toFailureMessage = (failure: Error): string => {
  const message = failure instanceof ApiError && failure.data?.["message"];

  if (isText(message)) {
    return message;
  }

  return toErrorText(failure);
};

export { toFailureMessage };
