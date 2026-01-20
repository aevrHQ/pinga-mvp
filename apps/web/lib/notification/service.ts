import { IUser } from "@/models/User";
import {
  NotificationPayload,
  NotificationChannel,
  ChannelConfig,
} from "./types";
import { telegramChannel } from "./channels/telegram";
import { discordChannel } from "./channels/discord";

export class NotificationService {
  private channels: Map<string, NotificationChannel> = new Map();

  constructor() {
    this.registerChannel(telegramChannel);
    this.registerChannel(discordChannel);
  }

  registerChannel(channel: NotificationChannel) {
    this.channels.set(channel.type, channel);
  }

  async send(user: IUser, notification: NotificationPayload): Promise<boolean> {
    // 1. Check Preferences (Source filtering)
    if (
      user.preferences?.allowedSources?.length > 0 &&
      notification.source &&
      !user.preferences.allowedSources.includes(notification.source)
    ) {
      console.log(
        `Skipping notification from source ${notification.source} (not in allowed list)`,
      );
      return false;
    }

    const results: boolean[] = [];

    // 2. Legacy Support: Send to Telegram if configured the old way
    if (user.telegramChatId && user.telegramBotToken) {
      // Create a transient config for legacy telegram
      const legacyConfig = {
        enabled: true,
        chatId: user.telegramChatId,
        botToken: user.telegramBotToken,
      };
      const success = await telegramChannel.send(legacyConfig, notification);
      results.push(success);
    }

    // 3. Multi-Channel Support
    if (user.channels && user.channels.length > 0) {
      for (const userChannel of user.channels) {
        if (!userChannel.enabled) continue;

        const channelImpl = this.channels.get(userChannel.type);
        if (channelImpl) {
          try {
            const success = await channelImpl.send(
              userChannel.config as ChannelConfig,
              notification,
            );
            results.push(success);
          } catch (error) {
            console.error(
              `Failed to send to channel ${userChannel.name} (${userChannel.type}):`,
              error,
            );
            results.push(false);
          }
        } else {
          console.warn(`Unknown channel type: ${userChannel.type}`);
        }
      }
    }

    return results.some((r) => r === true);
  }
}

export const notificationService = new NotificationService();
