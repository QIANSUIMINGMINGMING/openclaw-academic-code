function parseContentText(content) {
  if (typeof content !== "string") return "";
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.text === "string") return parsed.text.trim();
  } catch {
    return content.trim();
  }
  return content.trim();
}

export function normalizeOpenClawMessage(payload) {
  const text =
    payload.text ||
    payload.prompt ||
    payload.input ||
    payload.message?.text ||
    payload.message?.content ||
    "";

  return {
    source: "openclaw",
    channel: "openclaw",
    title: (String(text).trim() || "OpenClaw task").slice(0, 80),
    text: String(text).trim(),
    userId:
      payload.user_id ||
      payload.userId ||
      payload.actor?.id ||
      payload.sender?.id ||
      "openclaw-user",
    conversationId:
      payload.conversation_id ||
      payload.session_id ||
      payload.sessionId ||
      payload.chat_id ||
      null,
    metadata: payload.metadata || payload,
  };
}

export function normalizeFeishuEvent(payload) {
  const event = payload.event || {};
  const text = parseContentText(event.message?.content || payload.text || "");

  return {
    source: "feishu",
    channel: "openclaw-feishu",
    title: (text || "Feishu task").slice(0, 80),
    text,
    userId:
      event.sender?.sender_id?.open_id ||
      event.sender?.sender_id?.user_id ||
      event.sender?.sender_id?.union_id ||
      "feishu-user",
    conversationId: event.message?.chat_id || null,
    metadata: payload,
  };
}
