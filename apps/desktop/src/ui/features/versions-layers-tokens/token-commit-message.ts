import { ApiError, errorText } from "../../api.js";

const CONFLICT_STATUS = 409;
const AGENT_BUSY_MESSAGE = "Agent is running. Wait or cancel.";

const toCommitMessage = (error: Error): string => {
  if (error instanceof ApiError && error.status === CONFLICT_STATUS) {
    return AGENT_BUSY_MESSAGE;
  }

  return errorText(error);
};

export { AGENT_BUSY_MESSAGE, toCommitMessage };
