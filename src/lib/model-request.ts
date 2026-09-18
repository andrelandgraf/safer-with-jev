import { HttpError } from "./http-error";
import { isRecord } from "./json";

export type ModelProtocol = "chat-completions" | "responses";

const HOSTED_TOOLS = new Set([
  "file_search",
  "web_search",
  "computer",
  "code_interpreter",
  "mcp",
]);

const FORBIDDEN_FIELDS = ["previous_response_id", "conversation", "prompt"] as const;

function rejectForbidden(body: Record<string, unknown>): void {
  for (const field of FORBIDDEN_FIELDS) {
    if (field in body) {
      throw new HttpError(
        400,
        "unsupported_request",
        `${field} is not inspectable from the submitted body.`,
        "validation",
      );
    }
  }
}

function rejectStream(body: Record<string, unknown>): void {
  if ("stream" in body && body.stream !== false) {
    throw new HttpError(400, "unsupported_request", "stream must be omitted or false.", "validation");
  }
}

function isTextPart(value: unknown): boolean {
  return isRecord(value) && value.type === "text" && typeof value.text === "string";
}

function contentIsText(value: unknown): boolean {
  if (typeof value === "string") {
    return true;
  }
  if (Array.isArray(value) && value.length > 0 && value.every(isTextPart)) {
    return true;
  }
  return false;
}

const FORBIDDEN_PART_TYPES = new Set([
  "image",
  "image_url",
  "input_image",
  "audio",
  "input_audio",
  "file",
  "input_file",
  "video",
  "input_video",
]);

const OPAQUE_INPUT_TYPES = new Set([
  "item_reference",
  "item",
  "reasoning",
  "computer_call",
  "computer_call_output",
  "mcp_call",
  "mcp_list_tools",
  "mcp_approval_request",
  "mcp_approval_response",
]);

const INSPECTABLE_INPUT_TYPES = new Set([
  "message",
  "input_text",
  "output_text",
  "text",
  "function_call",
  "function_call_output",
]);

function rejectUninspectableInput(value: unknown): void {
  if (typeof value === "string") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      rejectUninspectableInput(item);
    }
    return;
  }
  if (!isRecord(value)) {
    throw new HttpError(
      400,
      "unsupported_request",
      "Responses input items must be text or inspectable objects.",
      "validation",
    );
  }
  if (typeof value.type === "string") {
    if (FORBIDDEN_PART_TYPES.has(value.type) || OPAQUE_INPUT_TYPES.has(value.type)) {
      throw new HttpError(
        400,
        "unsupported_request",
        `${value.type} parts are not inspectable.`,
        "validation",
      );
    }
    if (!INSPECTABLE_INPUT_TYPES.has(value.type)) {
      throw new HttpError(
        400,
        "unsupported_request",
        `${value.type} parts are not inspectable.`,
        "validation",
      );
    }
  }
  if (value.content !== undefined) {
    rejectUninspectableInput(value.content);
  }
  if (value.output !== undefined) {
    rejectUninspectableInput(value.output);
  }
}

function rejectHostedTools(tools: unknown): void {
  if (tools === undefined) {
    return;
  }
  if (!Array.isArray(tools)) {
    throw new HttpError(400, "unsupported_request", "tools must be an array.", "validation");
  }
  for (const tool of tools) {
    if (!isRecord(tool) || typeof tool.type !== "string") {
      throw new HttpError(400, "unsupported_request", "Each tool needs a type.", "validation");
    }
    if (tool.type !== "function") {
      if (HOSTED_TOOLS.has(tool.type)) {
        throw new HttpError(
          400,
          "unsupported_request",
          `Hosted tool type ${tool.type} is not inspectable.`,
          "validation",
        );
      }
      throw new HttpError(400, "unsupported_request", `Unsupported tool type ${tool.type}.`, "validation");
    }
  }
}

function labeledMessages(body: Record<string, unknown>): unknown[] {
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError(400, "unsupported_request", "messages must be a nonempty array.", "validation");
  }
  for (const message of messages) {
    if (!isRecord(message) || typeof message.role !== "string") {
      throw new HttpError(400, "unsupported_request", "Each message needs a role.", "validation");
    }
    const hasCalls = Array.isArray(message.tool_calls) || isRecord(message.function_call);
    if (message.content == null) {
      if (!(message.role === "assistant" && hasCalls)) {
        throw new HttpError(400, "unsupported_request", "Message content is missing.", "validation");
      }
    } else if (!contentIsText(message.content)) {
      throw new HttpError(400, "unsupported_request", "Only text message content is accepted.", "validation");
    }
  }
  return messages;
}

export function parseModelRequest(bytes: Uint8Array): {
  protocol: ModelProtocol;
  state: unknown;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON.", "validation");
  }
  if (!isRecord(parsed)) {
    throw new HttpError(400, "invalid_json", "Request body must be a JSON object.", "validation");
  }
  if (typeof parsed.model !== "string" || parsed.model.length === 0) {
    throw new HttpError(400, "unsupported_request", "model is required.", "validation");
  }
  rejectForbidden(parsed);
  rejectStream(parsed);
  rejectHostedTools(parsed.tools);

  const hasMessages = "messages" in parsed;
  const hasInput = "input" in parsed;
  if (hasMessages && hasInput) {
    throw new HttpError(400, "unsupported_request", "Do not mix messages and input.", "validation");
  }

  if (hasMessages) {
    const messages = labeledMessages(parsed);
    return {
      protocol: "chat-completions",
      state: {
        protocol: "chat-completions",
        model: parsed.model,
        messages,
        tools: parsed.tools ?? null,
      },
    };
  }

  if (typeof parsed.input === "string" && parsed.input.length > 0) {
    return {
      protocol: "responses",
      state: {
        protocol: "responses",
        model: parsed.model,
        instructions: typeof parsed.instructions === "string" ? parsed.instructions : null,
        input: parsed.input,
        tools: parsed.tools ?? null,
      },
    };
  }

  if (Array.isArray(parsed.input)) {
    rejectUninspectableInput(parsed.input);
    return {
      protocol: "responses",
      state: {
        protocol: "responses",
        model: parsed.model,
        instructions: typeof parsed.instructions === "string" ? parsed.instructions : null,
        input: parsed.input,
        tools: parsed.tools ?? null,
      },
    };
  }

  throw new HttpError(
    400,
    "unsupported_request",
    "JSON must be a Chat Completions or Responses request.",
    "validation",
  );
}

export function plainPromptState(text: string): {
  protocol: "plain";
  turns: [{ role: "user"; provenance: "untrusted"; text: string }];
} {
  return {
    protocol: "plain",
    turns: [{ role: "user", provenance: "untrusted", text }],
  };
}

export function parseInspectPrompt(bytes: Uint8Array, contentType: string): unknown {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "text/plain") {
    const text = new TextDecoder().decode(bytes).trim();
    if (!text) {
      throw new HttpError(400, "empty", "Prompt text is empty.", "validation");
    }
    return plainPromptState(text);
  }
  if (type === "application/json") {
    return parseModelRequest(bytes).state;
  }
  throw new HttpError(415, "unsupported_media_type", "Use text/plain or application/json.", "validation");
}

export function requireBearer(headers: Headers): string {
  const header = headers.get("authorization");
  if (!header || !/^Bearer\s+\S+$/i.test(header.trim())) {
    throw new HttpError(
      400,
      "missing_upstream_bearer",
      "Model forwarding requires Authorization: Bearer <upstream key>.",
      "validation",
    );
  }
  return header;
}
