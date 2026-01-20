import { config } from "./config";

interface SendMessageOptions {
  parseMode?: "MarkdownV2" | "HTML";
  disableWebPagePreview?: boolean;
  replyToMessageId?: number;
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
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Send a plain text message to Telegram (auto-escaped)
 */
import { ChannelResult } from "@/lib/notification/types";

export async function sendPlainMessage(
  text: string,
  chatIdOverride?: string,
  botTokenOverride?: string,
  replyToMessageId?: number,
): Promise<ChannelResult> {
  return sendMessage(
    escapeMarkdownV2(text),
    { parseMode: "MarkdownV2", replyToMessageId },
    chatIdOverride,
    botTokenOverride,
  );
}

/**
 * Send a raw message to Telegram
 */
export async function sendMessage(
  text: string,
  options: SendMessageOptions = {},
  chatIdOverride?: string,
  botTokenOverride?: string,
): Promise<ChannelResult> {
  const {
    parseMode = "MarkdownV2",
    disableWebPagePreview = true,
    replyToMessageId,
  } = options;

  const botToken = botTokenOverride || config.telegram.botToken;
  const chatId = chatIdOverride || config.telegram.chatId;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials missing (botToken or chatId)");
    return {
      success: false,
      error: "Telegram credentials missing (botToken or chatId)",
    };
  }

  console.log(
    `[Telegram] Sending message to chat_id: ${chatId} (Token starts with: ${botToken.substring(0, 5)}...)`,
  );

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    // Add a timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview,
        reply_to_message_id: replyToMessageId,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorText = await response.text();
      let rawError = errorText;
      try {
        rawError = JSON.parse(errorText);
      } catch {
        // failed to parse, keep text
      }

      console.error(
        `[Telegram] API Error! Status: ${response.status} | Chat: ${chatId} | Response: ${errorText}`,
      );
      return {
        success: false,
        error: `Telegram API Error: ${response.status} - ${errorText}`,
        rawError: {
          status: response.status,
          response: rawError,
        },
      };
    }

    console.log(`[Telegram] Message sent successfully to ${chatId}`);
    return { success: true, data: await response.json() };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Failed to send Telegram message:", err.message);
    if (err.cause) {
      console.error("Cause:", err.cause);
    }
    return { success: false, error: err.message, rawError: err };
  }
}

/**
 * Format and send a structured notification
 */
export async function sendNotification(
  notification: TelegramNotification,
): Promise<ChannelResult> {
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
