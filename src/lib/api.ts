import { NextResponse } from "next/server";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(error: unknown, fallbackStatus = 500) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { message: error.message, code: error.code } },
      { status: error.status },
    );
  }

  console.error(error);
  const message =
    error instanceof Error ? error.message : "Unexpected server error";

  return NextResponse.json(
    { success: false, error: { message, code: "INTERNAL_ERROR" } },
    { status: fallbackStatus },
  );
}
