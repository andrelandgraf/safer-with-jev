export type ErrorStage =
  | "admission"
  | "ingest"
  | "validation"
  | "vision"
  | "jev"
  | "destination";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly stage: ErrorStage;

  constructor(status: number, code: string, message: string, stage: ErrorStage) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.stage = stage;
  }
}

export function errorPayload(error: HttpError): Record<string, unknown> {
  return {
    error: {
      message: error.message,
      type: error.status === 403 ? "permission_error" : "invalid_request_error",
      code: error.code,
      param: null,
      stage: error.stage,
    },
  };
}
