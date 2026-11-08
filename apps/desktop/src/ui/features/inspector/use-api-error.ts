import { ApiError } from "../../api.js";

const CONFLICT_CODE = 409;

const isApiError = <Caught>(caught: Caught): caught is Caught & ApiError =>
  caught instanceof ApiError;

const isApiConflict = <Caught>(caught: Caught): boolean =>
  isApiError(caught) && caught.status === CONFLICT_CODE;

export { isApiConflict, isApiError };
