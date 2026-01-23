import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/webhook/config";
import { verifySlackRequest, sendSlackMessage } from "@/lib/webhook/slack";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { ModelMessage } from "ai";
import { parseDevflowCommand, getDevflowHelpText } from "@/lib/webhook/devflow";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  // Helper for logging
  const CommonUtils_sendSlackMessageWithLog = async (
    token: string,
    channelId: string,
    text: string,
  ) => {
    console.log(
      `[Slack] Sending message to ${channelId}: ${text.substring(0, 50)}...`,
    );
    const res = await sendSlackMessage(token, channelId, text);
    if (!res.success) {
      console.error(`[Slack] Failed to send message:`, res.error);
    } else {
      console.log(`[Slack] Message sent successfully`);
    }
    return res;
  };

  try {
    // 1. Verify Request Signature
    const { isValid, body } = await verifySlackRequest(
      request,
      config.slack.signingSecret,
    );

    if (!isValid) {
      console.error("[Slack Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const eventData = JSON.parse(body);

    // 2. Handle URL Verification (Slack's first check)
    if (eventData.type === "url_verification") {
      console.log("[Slack Webhook] URL Verification challenge received");
      return NextResponse.json({ challenge: eventData.challenge });
    }

    // 3. Handle Events
    if (eventData.type === "event_callback") {
      const event = eventData.event;

      // Ignore bot messages to prevent loops
      if (event.bot_id || event.subtype === "bot_message") {
        return NextResponse.json({ ok: true });
      }

      // We handle 'message' (DMs/Channel messages if subbed) and 'app_mention'
      if (event.type === "message" || event.type === "app_mention") {
        const text = event.text || "";
        const channelId = event.channel;
        const userId = event.user;

        console.log(
          `[Slack Webhook] Received ${event.type} in ${channelId} from ${userId}: ${text}`,
        );

        // --- DEVFLOW COMMAND HANDLING ---
        const devflowCmd = parseDevflowCommand(text);
        if (devflowCmd.isDevflow) {
          if (!devflowCmd.intent) {
            await sendSlackMessage(
              config.slack.botToken,
              channelId,
              getDevflowHelpText()
            );
            return NextResponse.json({ ok: true });
          }

          if (!devflowCmd.repo) {
            await sendSlackMessage(
              config.slack.botToken,
              channelId,
              `❌ Please specify a repository!\n\nExample:\n\`!devflow ${devflowCmd.intent} owner/repo ${devflowCmd.description || "description"}\``
            );
            return NextResponse.json({ ok: true });
          }

          // Send task to Agent Host via Pinga's copilot endpoint
          const taskId = randomUUID();
          const pingaBaseUrl = process.env.NEXT_PUBLIC_PINGA_URL || "http://localhost:3000";

          try {
            const response = await fetch(`${pingaBaseUrl}/api/copilot/command`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Secret": process.env.DEVFLOW_API_SECRET || "devflow-secret",
              },
              body: JSON.stringify({
                taskId,
                source: {
                  channel: "slack",
                  chatId: channelId,
                  messageId: event.ts,
                },
                payload: {
                  intent: devflowCmd.intent,
                  repo: devflowCmd.repo,
                  branch: devflowCmd.branch,
                  naturalLanguage: devflowCmd.description,
                  context: devflowCmd.context,
                },
              }),
            });

            if (response.ok) {
              await sendSlackMessage(
                config.slack.botToken,
                channelId,
                `🚀 *Devflow Task Started!*\n\n` +
                  `Intent: ${devflowCmd.intent}\n` +
                  `Repository: ${devflowCmd.repo}\n` +
                  `${devflowCmd.branch ? `Branch: ${devflowCmd.branch}\n` : ""}` +
                  `Request: ${devflowCmd.description}\n\n` +
                  `⏳ Processing... You'll receive updates here.\n\n` +
                  `Task ID: \`${taskId}\``
              );
              console.log(
                `[Slack Webhook] Forwarded devflow command to Agent Host: ${taskId}`
              );
            } else {
              await sendSlackMessage(
                config.slack.botToken,
                channelId,
                `❌ Failed to process Devflow command. Please try again later.`
              );
              console.error(
                `[Slack Webhook] Failed to forward devflow command: ${response.status}`
              );
            }
          } catch (error) {
            console.error("[Slack Webhook] Error forwarding devflow command:", error);
            await sendSlackMessage(
              config.slack.botToken,
              channelId,
              `❌ Error processing Devflow command: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }

          return NextResponse.json({ ok: true });
        }

        // --- LINKING LOGIC ---
        // Since we can't deep-link easily, users can type "link channel_..."
        if (text.toLowerCase().includes("link channel_")) {
          const match = text.match(/channel_([a-zA-Z0-9]+)_(\d+)/);
          if (match) {
            const [, userIdParam, channelIndexSafe] = match;
            const channelIndex = parseInt(channelIndexSafe, 10);

            await connectToDatabase();
            const user = await User.findById(userIdParam);
            const { default: Channel } = await import("@/models/Channel");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const channels: any[] = await Channel.find({
              userId: userIdParam,
            }).sort({
              createdAt: 1,
            });

            if (user && channels[channelIndex]) {
              const targetChannel = channels[channelIndex];
              const currentConfig = targetChannel.config || {};

              // Updates configuration with config.channelId
              // This field is what we use to route Slack messages back to this Channel/User
              targetChannel.config = {
                ...currentConfig,
                channelId: channelId, // Save the Slack Channel ID
                slackUserId: userId, // Save the user who linked it (optional, logic might not strictly need it)
              };

              await targetChannel.save();

              await sendSlackMessage(
                config.slack.botToken,
                channelId,
                `✅ *Channel Connected Successfully!*\n\n"${targetChannel.name || "Channel"}" is now linked to this Slack channel.\n\n🔔 You'll receive notifications here. You can also chat with me!`,
              );
              console.log(
                `[Slack] Linked Channel ${targetChannel._id} to Slack Channel ${channelId}`,
              );
            } else {
              await sendSlackMessage(
                config.slack.botToken,
                channelId,
                `❌ Could not find the channel to link.\n\nPlease check your dashboard and try again.`,
              );
            }
          }
          return NextResponse.json({ ok: true });
        }

        // --- CONVERSATION LOGIC ---
        // 1. Find who owns this channel
        await connectToDatabase();
        const { default: Channel } = await import("@/models/Channel");

        // Find Pinga Channel where config.channelId matches this Slack Channel ID
        const channelDoc = await Channel.findOne({
          "config.channelId": channelId,
        });

        if (channelDoc) {
          const user = await User.findById(channelDoc.userId);

          if (user) {
            const { generateChatResponse } =
              await import("@/lib/agents/chatAssistant");

            // Prepare History
            let history: ModelMessage[] = [];
            if (user.chatHistory) {
              history = user.chatHistory
                .map((msg: { role: string; content: string }) => ({
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                }))
                .slice(-10);
            }

            // Generate Response
            // Slack doesn't give a simple "first_name" in the event usually without extra API call,
            // but we can look it up or just use a generic name. event.user is the ID.
            const result = await generateChatResponse({
              message: text,
              senderName: "User", // We could fetch user info if needed
              history,
              userId: user._id.toString(),
            });

            if (result && result.text) {
              // Send Reply
              // Use thread if it was a thread, or just channel
              // const threadTs = event.thread_ts || event.ts;
              // For now, let's reply in thread to keep things tidy, OR main channel if prefered.
              // Telegram implementation sends to main chat.
              // Slack best practice for bots often is threading to avoid noise, but let's stick to main unless threaded.

              await CommonUtils_sendSlackMessageWithLog(
                config.slack.botToken,
                channelId,
                result.text,
              );

              // Update History
              await User.updateOne(
                { _id: user._id },
                {
                  $push: {
                    chatHistory: {
                      $each: [
                        { role: "user", content: text, createdAt: new Date() },
                        {
                          role: "assistant",
                          content: result.text,
                          createdAt: new Date(),
                        },
                      ],
                      $slice: -50,
                    },
                  },
                },
              );
            } else {
              console.log("[Slack Webhook] No text returned from agent");
            }
          } else {
            console.log(
              "[Slack Webhook] User not found for channel:",
              channelDoc._id,
            );
          }
        } else {
          console.log(
            "[Slack Webhook] No linked channel found for Slack channel:",
            channelId,
          );
          // Not linked yet.
          // If it was a direct mention, we might want to say "I'm not linked".
          if (event.type === "app_mention") {
            await CommonUtils_sendSlackMessageWithLog(
              config.slack.botToken,
              channelId,
              `👋 I'm here! But I'm not linked to a Pinga channel yet.\n\nTo link me, use the "Connect with Slack" button in your dashboard or type "@Pinga link <your-link-code>".`,
            );
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Slack Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
