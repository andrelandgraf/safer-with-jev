function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === "string") {
      parts.push(part);
      continue;
    }
    if (!isRecord(part)) {
      continue;
    }
    if (typeof part.text === "string") {
      parts.push(part.text);
    }
  }
  return parts.join("\n");
}

function lastUserMessage(messages: unknown): string {
  if (!Array.isArray(messages)) {
    return "";
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!isRecord(message)) {
      continue;
    }
    if (message.role !== "user") {
      continue;
    }
    const text = textFromContent(message.content);
    if (text.trim()) {
      return text;
    }
  }
  return "";
}

export function promptFromChatBody(body: Record<string, unknown>): string {
  return lastUserMessage(body.messages).trim();
}

export function promptFromResponsesBody(body: Record<string, unknown>): string {
  const input = body.input;
  if (typeof input === "string") {
    return input.trim();
  }
  if (!Array.isArray(input)) {
    return promptFromChatBody(body);
  }

  const chunks: string[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      chunks.push(item);
      continue;
    }
    if (!isRecord(item)) {
      continue;
    }
    if (typeof item.content === "string") {
      chunks.push(item.content);
      continue;
    }
    const text = textFromContent(item.content);
    if (text) {
      chunks.push(text);
    }
  }
  return chunks.join("\n").trim();
}
