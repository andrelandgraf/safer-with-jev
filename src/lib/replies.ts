import { HttpError } from "./http-error";
import { isRecord } from "./json";

export function parseReplyBody(bytes: Uint8Array, contentType: string): unknown {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "text/plain") {
    const text = new TextDecoder().decode(bytes);
    if (!text.trim()) {
      throw new HttpError(400, "empty", "Reply text is empty.", "validation");
    }
    return { protocol: "plain-reply", text };
  }
  if (type !== "application/json") {
    throw new HttpError(415, "unsupported_media_type", "Use text/plain or application/json.", "validation");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON.", "validation");
  }
  if (!isRecord(parsed)) {
    throw new HttpError(400, "invalid_json", "Request body must be a JSON object.", "validation");
  }

  if (typeof parsed.text === "string") {
    return replyState("json-reply", parsed.text, parsed.tool_calls ?? parsed.function_call ?? null);
  }
  if (typeof parsed.content === "string") {
    return replyState("json-reply", parsed.content, parsed.tool_calls ?? null);
  }
  if (typeof parsed.reply === "string") {
    return replyState("json-reply", parsed.reply, parsed.tool_calls ?? null);
  }

  if (Array.isArray(parsed.choices) && isRecord(parsed.choices[0]) && isRecord(parsed.choices[0].message)) {
    const message = parsed.choices[0].message;
    const text = typeof message.content === "string" ? message.content : "";
    return replyState("chat-completion-reply", text, message.tool_calls ?? message.function_call ?? null);
  }

  throw new HttpError(
    400,
    "unsupported_request",
    "JSON must include text, content, reply, or a chat completion message.",
    "validation",
  );
}

function replyState(protocol: string, text: string, toolCalls: unknown): unknown {
  if (!text.trim() && toolCalls == null) {
    throw new HttpError(400, "empty", "Reply text is empty.", "validation");
  }
  return { protocol, text, tool_calls: toolCalls };
}
