import test from "node:test";
import assert from "node:assert/strict";

import { normalizeFeishuEvent, normalizeOpenClawMessage } from "../lib/inbound.js";

test("normalizeOpenClawMessage accepts common payload shapes", () => {
  const task = normalizeOpenClawMessage({
    prompt: "run a semantic scheduling literature sweep",
    user_id: "u-openclaw",
    conversation_id: "conv-1",
  });

  assert.equal(task.source, "openclaw");
  assert.equal(task.text, "run a semantic scheduling literature sweep");
  assert.equal(task.userId, "u-openclaw");
  assert.equal(task.conversationId, "conv-1");
});

test("normalizeFeishuEvent extracts text from Feishu content JSON", () => {
  const task = normalizeFeishuEvent({
    header: { event_type: "im.message.receive_v1" },
    event: {
      message: {
        chat_id: "chat-1",
        content: JSON.stringify({ text: "整理 semantic scheduling baseline gap" }),
      },
      sender: {
        sender_id: {
          open_id: "ou_123",
        },
      },
    },
  });

  assert.equal(task.source, "feishu");
  assert.equal(task.channel, "openclaw-feishu");
  assert.equal(task.userId, "ou_123");
  assert.equal(task.conversationId, "chat-1");
  assert.equal(task.text, "整理 semantic scheduling baseline gap");
});
