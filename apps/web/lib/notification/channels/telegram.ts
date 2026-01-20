import {
  NotificationChannel,
  ChannelConfig,
  NotificationPayload,
} from "../types";
import { sendMessage, escapeMarkdownV2 } from "@/lib/webhook/telegram";

export class TelegramChannel implements NotificationChannel {
  name = "Telegram";
  type = "telegram";

  async send(
    config: ChannelConfig,
    notification: NotificationPayload,
  ): Promise<boolean> {
    if (!config.enabled) return false;

    // Extract chat ID and bot token from config or fallback (logic adapted)
    const chatId = (config.chatId as string) || process.env.TELEGRAM_CHAT_ID;
    const botToken =
      (config.botToken as string) || process.env.TELEGRAM_BOT_TOKEN;

    if (!chatId || !botToken) {
      console.warn("Telegram channel missing credentials");
      return false;
    }

    const lines: string[] = [];

    // Use summary if available and preferred, otherwise standard format
    // For now, checks are done in Service, here we just format what we get.
    // But let's append summary if present.

    if (notification.summary) {
      lines.push(`${escapeMarkdownV2(notification.summary)}`);
      lines.push(""); // Spacer
    } else {
      // Title with emoji
      lines.push(
        `${notification.emoji} *${escapeMarkdownV2(notification.title)}*`,
      );
      lines.push("");
    }

    // Fields (only show if no summary or if explicitly desired?
    // Let's show detailed fields usually, but if summary is present maybe we want to be briefer?
    // For MVP, l'll strip fields if summary exists to keep it "summary" style,
    // OR we can make it a "Thread" style?
    // Let's stick to: If summary, show summary + link. If no summary, show full details.
    if (!notification.summary) {
      for (const field of notification.fields) {
        const label = escapeMarkdownV2(field.label);
        const value = escapeMarkdownV2(field.value);
        lines.push(`${label}: ${value}`);
      }
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

    // Payload link is always useful
    lines.push("");
    lines.push(
      `📄 [View Full Payload](${escapeMarkdownV2(notification.payloadUrl)})`,
    );

    const message = lines.join("\n");

    return sendMessage(message, {}, chatId, botToken);
  }
}

export const telegramChannel = new TelegramChannel();
