/**
 * Escapes special characters for Slack mrkdwn
 * https://api.slack.com/reference/surfaces/formatting#escaping
 */
export function escapeSlack(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sends a message to a Slack Webhook URL
 */
export async function sendSlackWebhook(
  webhookUrl: string,
  payload: { text?: string; blocks?: any[] },
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        error: `Slack API error: ${response.status} ${text}`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
