import {
  NotificationChannel,
  ChannelConfig,
  NotificationPayload,
} from "../types";

export interface WebhookConfig extends ChannelConfig {
  webhookUrl: string;
}

export const webhookChannel: NotificationChannel = {
  name: "Webhook",
  type: "webhook",
  send: async (config: WebhookConfig, notification: NotificationPayload) => {
    if (!config.enabled) {
      return { success: false, error: "Channel disabled" };
    }
    if (!config.webhookUrl) {
      return { success: false, error: "Missing webhookUrl" };
    }

    try {
      const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...notification,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        let errorText = await response.text().catch(() => response.statusText);
        // Truncate if too long
        if (errorText.length > 500)
          errorText = errorText.substring(0, 500) + "...";

        return {
          success: false,
          error: `Webhook failed: ${response.status} ${response.statusText}`,
          rawError: errorText,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        rawError: error,
      };
    }
  },
};
