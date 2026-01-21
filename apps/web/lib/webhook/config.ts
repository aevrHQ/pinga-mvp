export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || "",
    signingSecret: process.env.SLACK_SIGNING_SECRET || "",
  },
  baseUrl:
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  storage: {
    ttlHours: parseInt(process.env.PAYLOAD_TTL_HOURS || "24", 10),
  },
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.telegram.botToken) {
    errors.push("TELEGRAM_BOT_TOKEN is required");
  }
  if (!config.telegram.chatId) {
    errors.push("TELEGRAM_CHAT_ID is required");
  }

  return { valid: errors.length === 0, errors };
}
