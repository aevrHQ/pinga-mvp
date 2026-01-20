// Native fetch is available in Node 18+

async function testWebhookReply() {
  const WEBHOOK_URL = "http://localhost:3000/api/webhook/telegram";

  // Mock Telegram Update Object
  const mockUpdate = {
    update_id: 123456789,
    message: {
      message_id: 99999, // Fake message ID to reply to
      from: {
        id: 123456789,
        is_bot: false,
        first_name: "TestUser",
        username: "testuser",
        language_code: "en",
      },
      chat: {
        id: -5126303421, // Use the real test group ID if known, or a fake one
        title: "Test Group",
        type: "supergroup",
      },
      date: 1678888888,
      text: "@pingapingbot hello world (test reply)", // Mentioning the bot
    },
  };

  console.log("Sending mock webhook update...");

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockUpdate),
    });

    const data = await response.json();
    console.log("Webhook Response:", data);

    if (response.ok) {
      console.log(
        "✅ Webhook processed successfully. Check server logs for 'Sending message to chat_id' and 'reply_to_message_id'.",
      );
    } else {
      console.error("❌ Webhook failed:", response.status);
    }
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}

testWebhookReply();
