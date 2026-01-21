import {
  NotificationChannel,
  ChannelConfig,
  NotificationPayload,
  ChannelResult,
} from "../types";
import { escapeSlack, sendSlackWebhook } from "@/lib/webhook/slack";

export class SlackChannel implements NotificationChannel {
  name = "Slack";
  type = "slack";

  async send(
    config: ChannelConfig,
    notification: NotificationPayload,
  ): Promise<ChannelResult> {
    if (!config.enabled) return { success: false, error: "Channel disabled" };

    const webhookUrl = config.webhookUrl as string;

    if (!webhookUrl) {
      console.warn("Slack channel missing webhook URL");
      return { success: false, error: "Missing Slack webhook URL" };
    }

    // Convert Pinga notification to Slack Block Kit
    // https://api.slack.com/block-kit

    const blocks: any[] = [];

    // Header / Title
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `${notification.emoji || "🔔"} ${notification.title}`,
        emoji: true,
      },
    });

    // Summary (Context)
    if (notification.summary) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: escapeSlack(notification.summary),
        },
      });
    }

    // Fields
    if (
      notification.fields &&
      notification.fields.length > 0 &&
      !notification.summary
    ) {
      const fields = notification.fields.map((field) => ({
        type: "mrkdwn",
        text: `*${escapeSlack(field.label)}*\n${escapeSlack(field.value)}`,
      }));

      // Slack sections allow up to 10 fields
      // chunk them if needed, but for now take first 10
      blocks.push({
        type: "section",
        fields: fields.slice(0, 10),
      });
    }

    // Links
    if (notification.links && notification.links.length > 0) {
      const linkTexts = notification.links
        .map((link) => `<${link.url}|${escapeSlack(link.label)}>`)
        .join("  |  ");

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🔗 ${linkTexts}`,
          },
        ],
      });
    }

    // Payload Link (Button)
    if (notification.payloadUrl) {
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Full Payload",
              emoji: true,
            },
            url: notification.payloadUrl,
          },
        ],
      });
    }

    return sendSlackWebhook(webhookUrl, { blocks });
  }
}

export const slackChannel = new SlackChannel();
