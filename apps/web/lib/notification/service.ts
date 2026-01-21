import { IUser } from "@/models/User";
import NotificationLog from "@/models/NotificationLog";
import {
  NotificationPayload,
  NotificationChannel,
  ChannelConfig,
  UserChannel,
} from "./types";
import { telegramChannel } from "./channels/telegram";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";

export class NotificationService {
  private channels: Map<string, NotificationChannel> = new Map();

  constructor() {
    this.registerChannel(telegramChannel);
    this.registerChannel(discordChannel);
    this.registerChannel(slackChannel);
  }

  registerChannel(channel: NotificationChannel) {
    this.channels.set(channel.type, channel);
  }

  async send(user: IUser, notification: NotificationPayload): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (user as any)._id || (user as any).id;

    // 1. Check Preferences (Source filtering)
    if (
      user.preferences?.allowedSources?.length > 0 &&
      notification.source &&
      !user.preferences.allowedSources.includes(notification.source)
    ) {
      console.log(
        `Skipping notification from source ${notification.source} (not in allowed list)`,
      );

      await this.logAttempt(
        userId,
        undefined,
        "global",
        "Global Preferences",
        notification,
        "skipped",
        `Source ${notification.source} not in allowed list`,
      );

      return false;
    }

    const results: boolean[] = [];

    // 2. Legacy Support: Send to Telegram if configured the old way
    if (user.telegramChatId && user.telegramBotToken) {
      // Check if legacy channel should receive this webhook
      const legacyChannel = {
        type: "telegram",
        enabled: true,
        config: {
          chatId: user.telegramChatId,
          botToken: user.telegramBotToken,
        },
      };

      if (this.shouldSendToChannel(legacyChannel, notification)) {
        const result = await telegramChannel.send(
          { ...legacyChannel.config, enabled: true } as ChannelConfig,
          notification,
        );
        results.push(result.success);

        // Optional: Log legacy attempt if needed, or rely on old behavior (which was silent?)
        // The original code didn't log legacy attempts to the database, so we keep it as is
        // unless we want to start logging them. The original code only pushed to results.
      }
    }

    // 3. Multi-Channel Support
    // 3. Multi-Channel Support
    const { default: Channel } = await import("@/models/Channel");
    const channels = await Channel.find({ userId });

    if (channels && channels.length > 0) {
      for (const ch of channels) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userChannel: any = ch.toObject ? ch.toObject() : ch;
        if (!userChannel.enabled) continue;

        // Check webhook rules
        if (
          !this.shouldSendToChannel(userChannel as UserChannel, notification)
        ) {
          console.log(
            `Filtered out ${notification.source} for channel "${userChannel.name || userChannel.type}"`,
          );

          await this.logAttempt(
            userId,
            userChannel._id,
            userChannel.type,
            userChannel.name,
            notification,
            "skipped",
            "Filtered by channel rules",
          );
          continue;
        }

        const channelImpl = this.channels.get(userChannel.type);
        if (channelImpl) {
          console.log(
            `[NotificationService] Dispatching to channel: ${userChannel.name} (${userChannel.type})`,
          );
          try {
            const result = await channelImpl.send(
              {
                ...userChannel.config,
                enabled: userChannel.enabled,
              } as ChannelConfig,
              notification,
            );
            results.push(result.success);

            await this.logAttempt(
              userId,
              userChannel._id,
              userChannel.type,
              userChannel.name,
              notification,
              result.success ? "success" : "failure",
              result.error || (result.success ? undefined : "Unknown failure"),
              result.rawError,
            );
          } catch (error) {
            console.error(
              `Failed to send to channel ${userChannel.name} (${userChannel.type}):`,
              error,
            );
            results.push(false);

            await this.logAttempt(
              userId,
              userChannel._id,
              userChannel.type,
              userChannel.name,
              notification,
              "failure",
              String(error),
            );
          }
        } else {
          console.warn(`Unknown channel type: ${userChannel.type}`);
          await this.logAttempt(
            userId,
            userChannel._id,
            userChannel.type,
            userChannel.name,
            notification,
            "failure",
            `Unknown channel type: ${userChannel.type}`,
          );
        }
      }
    }

    return results.some((r) => r === true);
  }

  private shouldSendToChannel(
    channel:
      | UserChannel
      | {
          type: string;
          enabled: boolean;
          config: Record<string, unknown>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          webhookRules?: any;
        },
    notification: NotificationPayload,
  ): boolean {
    const rules = channel.webhookRules;

    // No rules = send everything (backward compatible)
    if (!rules?.sources?.length) return true;

    const source = notification.source || notification.eventType || "unknown";

    // Find rule for this source
    const sourceRule = rules.sources.find(
      (s: { type: string }) => s.type === source,
    );

    // Source not in list = block
    if (!sourceRule) {
      console.log(`Source ${source} not in webhook rules`);
      return false;
    }

    // Source disabled = block
    if (!sourceRule.enabled) {
      console.log(`Source ${source} is disabled`);
      return false;
    }

    const filters = sourceRule.filters;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = (notification.rawPayload || {}) as Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >;

    // Repository filter (for GitHub)
    if (filters.repositories?.length) {
      const repo = data.repository?.full_name || data.repository?.name;
      if (!repo || !filters.repositories.includes(repo)) {
        console.log(
          `Repository ${repo} not in filter list: ${filters.repositories.join(", ")}`,
        );
        return false;
      }
    }

    // Event type filter
    if (filters.eventTypes?.length) {
      const eventType =
        notification.eventType ||
        data.action ||
        data.deployment_status?.state ||
        data.event;

      if (!eventType || !filters.eventTypes.includes(eventType)) {
        console.log(
          `Event ${eventType} not in filter list: ${filters.eventTypes.join(", ")}`,
        );
        return false;
      }
    }

    // Service filter (for Render, Vercel)
    if (filters.services?.length) {
      const service = data.service?.name || data.project?.name;
      if (!service || !filters.services.includes(service)) {
        console.log(
          `Service ${service} not in filter list: ${filters.services.join(", ")}`,
        );
        return false;
      }
    }

    return true;
  }

  private async logAttempt(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userId: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channelId: any,
    channelType: string,
    channelName: string | undefined,
    notification: NotificationPayload,
    status: "success" | "failure" | "skipped",
    error?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawError?: any,
  ) {
    try {
      await NotificationLog.create({
        userId,
        channelId,
        channelType,
        channelName,
        source: notification.source || "unknown",
        eventType: notification.eventType || "unknown",
        status,
        error,
        rawError,
        metadata: {
          title: notification.title,
          payloadUrl: notification.payloadUrl,
        },
      });
    } catch (e) {
      console.error("Failed to save notification log:", e);
    }
  }
}

export const notificationService = new NotificationService();
