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

/**
 * Sends a message using the Slack Web API (Bot Token)
 */
export async function sendSlackMessage(
  token: string,
  channelId: string,
  text: string,
  threadTs?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel: channelId,
        text,
        thread_ts: threadTs,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return {
        success: false,
        error: `Slack API error: ${data.error}`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

import crypto from "crypto";

/**
 * Verifies the Slack Request Signature
 */
export async function verifySlackRequest(
  req: Request,
  signingSecret: string,
): Promise<{ isValid: boolean; body: string }> {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return { isValid: false, body };
  }

  // Prevent replay attacks (5 minutes)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return { isValid: false, body };
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBasestring, "utf8")
      .digest("hex");

  // Constant time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(signature, "utf8"),
  );

  return { isValid, body };
}
