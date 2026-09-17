export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new Error("Request body must be JSON");
  }
  if (!isRecord(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed;
}
