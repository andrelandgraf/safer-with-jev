import { HttpError } from "./http-error";
import { isRecord } from "./json";

function textFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === "string") {
        parts.push(part);
        continue;
      }
      if (isRecord(part) && typeof part.text === "string") {
        parts.push(part.text);
        continue;
      }
      throw new HttpError(
        400,
        "unsupported_request",
        "Reply content must be text.",
        "validation",
      );
    }
    return parts.join("\n");
  }
  if (content == null) {
    return "";
  }
  throw new HttpError(400, "unsupported_request", "Reply content must be text.", "validation");
}

function toolPayload(message: Record<string, unknown>): unknown {
  if (message.tool_calls !== undefined) {
    return message.tool_calls;
  }
  if (isRecord(message.function_call)) {
    return {
      name: message.function_call.name ?? null,
      arguments: message.function_call.arguments ?? null,
    };
  }
  return null;
}

function collectChatCompletionReplies(choices: unknown[]): { text: string; toolCalls: unknown } {
  const texts: string[] = [];
  const toolCalls: unknown[] = [];
  for (const choice of choices) {
    if (!isRecord(choice) || !isRecord(choice.message)) {
      throw new HttpError(
        400,
        "unsupported_request",
        "Each chat completion choice needs a message.",
        "validation",
      );
    }
    const text = textFromContent(choice.message.content);
    if (text) {
      texts.push(text);
    }
    const tools = toolPayload(choice.message);
    if (tools != null) {
      toolCalls.push(tools);
    }
  }
  return { text: texts.join("\n"), toolCalls: toolCalls.length > 0 ? toolCalls : null };
}

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
    return replyState(
      "json-reply",
      parsed.content,
      parsed.tool_calls ?? parsed.function_call ?? null,
    );
  }
  if (typeof parsed.reply === "string") {
    return replyState("json-reply", parsed.reply, parsed.tool_calls ?? parsed.function_call ?? null);
  }

  if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
    const collected = collectChatCompletionReplies(parsed.choices);
    return replyState("chat-completion-reply", collected.text, collected.toolCalls);
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
