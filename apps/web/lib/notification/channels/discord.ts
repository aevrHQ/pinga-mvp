import {
  NotificationChannel,
  ChannelConfig,
  NotificationPayload,
} from "../types";

export class DiscordChannel implements NotificationChannel {
  name = "Discord";
  type = "discord";

  async send(
    config: ChannelConfig,
    notification: NotificationPayload,
  ): Promise<boolean> {
    if (!config.enabled) return false;

    const webhookUrl = config.webhookUrl as string;

    if (!webhookUrl) {
      console.warn("Discord channel missing webhookUrl");
      return false;
    }

    // Map fields to Discord Embed Fields
    const fields = notification.fields.map((f) => ({
      name: f.label,
      value: f.value,
      inline: true,
    }));

    // Add Links as a field if present
    if (notification.links.length > 0) {
      const linksText = notification.links
        .map((l) => `[${l.label}](${l.url})`)
        .join("\n");
      fields.push({
        name: "Links",
        value: linksText,
        inline: false,
      });
    }

    // Construct Embed
    const embed = {
      title: `${notification.emoji} ${notification.title}`,
      description: notification.summary || undefined, // Use summary if available
      url: notification.payloadUrl,
      color: 5814783, // #5865F2 (Discord Blurple)
      fields: fields,
      footer: {
        text: `Source: ${notification.source || "System"}`,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        console.error(
          "Discord API error:",
          response.status,
          await response.text(),
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to send Discord message:", error);
      return false;
    }
  }
}

export const discordChannel = new DiscordChannel();
