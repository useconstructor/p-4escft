import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Omit<ApiErrorBody["error"], "code" | "message"> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, ...this.details } };
  }
}
