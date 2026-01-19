import { config } from "./config";

interface SendMessageOptions {
  parseMode?: "MarkdownV2" | "HTML";
  disableWebPagePreview?: boolean;
}

export interface TelegramNotification {
  title: string;
  emoji: string;
  fields: { label: string; value: string }[];
  links: { label: string; url: string }[];
  payloadUrl: string;
  // SaaS overrides
  chatId?: string;
  botToken?: string;
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Send a raw message to Telegram
 */
export async function sendMessage(
  text: string,
  options: SendMessageOptions = {},
  chatIdOverride?: string,
  botTokenOverride?: string,
): Promise<boolean> {
  const { parseMode = "MarkdownV2", disableWebPagePreview = true } = options;

  const botToken = botTokenOverride || config.telegram.botToken;
  const chatId = chatIdOverride || config.telegram.chatId;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials missing (botToken or chatId)");
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

/**
 * Format and send a structured notification
 */
export async function sendNotification(
  notification: TelegramNotification,
): Promise<boolean> {
  const lines: string[] = [];

  // Title with emoji
  lines.push(`${notification.emoji} *${escapeMarkdownV2(notification.title)}*`);
  lines.push("");

  // Fields
  for (const field of notification.fields) {
    const label = escapeMarkdownV2(field.label);
    const value = escapeMarkdownV2(field.value);
    lines.push(`${label}: ${value}`);
  }

  // Links section
  if (notification.links.length > 0) {
    lines.push("");
    lines.push("🔗 *Links:*");
    for (const link of notification.links) {
      const label = escapeMarkdownV2(link.label);
      lines.push(`  • [${label}](${link.url})`);
    }
  }

  // Payload link
  lines.push("");
  lines.push(`📄 [View Full Payload](${notification.payloadUrl})`);

  const message = lines.join("\n");

  return sendMessage(message, {}, notification.chatId, notification.botToken);
}
