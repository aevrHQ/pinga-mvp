import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User, { UserDocument } from "@/models/User";
import { sendPlainMessage } from "@/lib/webhook/telegram";
import { ModelMessage } from "ai";
import { transcribeAudio } from "@/lib/transcription";
import { config } from "@/lib/webhook/config";
import { parseDevflowCommand, getDevflowHelpText } from "@/lib/webhook/devflow";
import { randomUUID } from "crypto";

// This route receives webhooks FROM Telegram
// You need to set your telegram bot webhook to point here:
// https://<your-domain>/api/webhook/telegram
// URL: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/webhook/telegram

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // LOUD LOGGING for debugging group visibility
    console.log(
      `[Telegram Webhook] Raw Update:`,
      JSON.stringify(update, null, 2).substring(0, 500),
    );

    // Check if it's a message
    if (update.message) {
      // eslint-disable-next-line prefer-const
      let { text, voice, chat } = update.message;

      // Enhanced Logging
      console.log(
        `[Telegram Webhook] Received message in ${chat.type} (${chat.id}):`,
        text ? `Text: "${text}"` : `Voice Message`,
      );

      // --- VOICE HANDLING ---
      if (voice) {
        try {
          await connectToDatabase();
          // Find user to save history (User lookup strategy mirroring the one below)
          let user: UserDocument | null = await User.findOne({
            telegramChatId: chat.id.toString(),
          });

          if (!user) {
            const { default: Channel } = await import("@/models/Channel");
            const channel = await Channel.findOne({
              "config.chatId": chat.id.toString(),
            });
            if (channel) {
              user = await User.findById(channel.userId);
            }
          }

          if (!user) {
            await sendPlainMessage(
              "⚠️ Please connect your Telegram account first to use voice commands.",
              chat.id.toString(),
            );
            return NextResponse.json({ ok: true });
          }

          // Fetch file path
          const fileId = voice.file_id;
          const fileRes = await fetch(
            `https://api.telegram.org/bot${config.telegram.botToken}/getFile?file_id=${fileId}`,
          );
          const fileData = await fileRes.json();
          if (!fileData.ok) throw new Error("Failed to get file path");

          const filePath = fileData.result.file_path;
          const downloadUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;

          // Download
          const audioRes = await fetch(downloadUrl);
          const arrayBuffer = await audioRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Transcribe
          const transcription = await transcribeAudio(buffer);

          const responseText = `🎤 I heard: '${transcription}'\n\nReply YES to execute this command.`;
          await sendPlainMessage(responseText, chat.id.toString());

          // Save interaction needed for context
          await User.updateOne(
            { _id: user._id },
            {
              $push: {
                chatHistory: {
                  $each: [
                    {
                      role: "assistant",
                      content: responseText,
                      createdAt: new Date(),
                    },
                  ],
                  $slice: -50,
                },
              },
            },
          );

          return NextResponse.json({ ok: true });
        } catch (e) {
          console.error("Voice processing error:", e);
          await sendPlainMessage(
            "❌ Sorry, I couldn't transcribe that voice message.",
            chat.id.toString(),
          );
          return NextResponse.json({ ok: true });
        }
      }

      // --- TEXT & CONFIRMATION HANDLING ---
      if (text) {
        // Check for confirmation
        const lower = text.trim().toLowerCase();
        if (["yes", "y", "confirm", "ok", "sure", "do it"].includes(lower)) {
          await connectToDatabase();
          // Find user to check history
          let user: UserDocument | null = await User.findOne({
            telegramChatId: chat.id.toString(),
          });
          if (!user) {
            const { default: Channel } = await import("@/models/Channel");
            const channel = await Channel.findOne({
              "config.chatId": chat.id.toString(),
            });
            if (channel) user = await User.findById(channel.userId);
          }

          if (user && user.chatHistory && user.chatHistory.length > 0) {
            const lastMsg = user.chatHistory[user.chatHistory.length - 1];
            // Look for the specific voice confirmation pattern
            if (
              lastMsg.role === "assistant" &&
              lastMsg.content.includes("🎤 I heard:")
            ) {
              const match = lastMsg.content.match(/I heard: '([^']+)'/);
              if (match && match[1]) {
                text = match[1]; // SWAP text for the transcribed command
                await sendPlainMessage(
                  `✅ Executing: "${text}"...`,
                  chat.id.toString(),
                );
              }
            }
          }
        }

        // --- EXISTING LOGIC STARTS HERE (using potentially modified 'text') ---

        // --- DEVFLOW COMMAND HANDLING ---
        const devflowCmd = parseDevflowCommand(text);
        if (devflowCmd.isDevflow) {
          if (!devflowCmd.intent) {
            await sendPlainMessage(getDevflowHelpText(), chat.id.toString());
            return NextResponse.json({ ok: true });
          }

          if (!devflowCmd.repo) {
            await sendPlainMessage(
              `❌ Please specify a repository!\n\nExample:\n\`!devflow ${devflowCmd.intent} owner/repo ${devflowCmd.description || "description"}\``,
              chat.id.toString()
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
                  channel: "telegram",
                  chatId: chat.id.toString(),
                  messageId: update.message.message_id,
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
              await sendPlainMessage(
                `🚀 *Devflow Task Started!*\n\n` +
                  `Intent: ${devflowCmd.intent}\n` +
                  `Repository: ${devflowCmd.repo}\n` +
                  `${devflowCmd.branch ? `Branch: ${devflowCmd.branch}\n` : ""}` +
                  `Request: ${devflowCmd.description}\n\n` +
                  `⏳ Processing... You'll receive updates here.\n\n` +
                  `Task ID: \`${taskId}\``,
                chat.id.toString()
              );
              console.log(
                `[Telegram Webhook] Forwarded devflow command to Agent Host: ${taskId}`
              );
            } else {
              await sendPlainMessage(
                `❌ Failed to process Devflow command. Please try again later.`,
                chat.id.toString()
              );
              console.error(
                `[Telegram Webhook] Failed to forward devflow command: ${response.status}`
              );
            }
          } catch (error) {
            console.error("[Telegram Webhook] Error forwarding devflow command:", error);
            await sendPlainMessage(
              `❌ Error processing Devflow command: ${error instanceof Error ? error.message : "Unknown error"}`,
              chat.id.toString()
            );
          }

          return NextResponse.json({ ok: true });
        }

        // Handle /help command
        if (
          text.toLowerCase() === "/help" ||
          text.toLowerCase().startsWith("/help@")
        ) {
          const isGroup = chat.type === "group" || chat.type === "supergroup";
          const helpMessage = isGroup
            ? `🤖 *Pinga Bot - Group Chat Setup*\n\n` +
              `To receive notifications in this group:\n\n` +
              `1️⃣ Go to your Pinga Dashboard → Settings\n` +
              `2️⃣ Click "Add Telegram" to create a new channel\n` +
              `3️⃣ Click "Connect with Telegram"\n` +
              `4️⃣ The link will automatically connect this group!\n\n` +
              `💡 *Tip:* You can filter which notifications come here by configuring webhook rules in the dashboard.\n\n` +
              `Need help? Visit your dashboard for more options.`
            : `🤖 *Pinga Bot - Personal Chat Setup*\n\n` +
              `To receive notifications here:\n\n` +
              `1️⃣ Go to your Pinga Dashboard → Settings\n` +
              `2️⃣ Click "Add Telegram" to create a new channel\n` +
              `3️⃣ Click "Connect with Telegram"\n` +
              `4️⃣ You'll be redirected here to complete the setup!\n\n` +
              `✨ You can have multiple channels for different projects.\n\n` +
              `Need help? Visit your dashboard for more options.`;

          await sendPlainMessage(helpMessage, chat.id.toString());
          return NextResponse.json({ ok: true });
        }

        // Handle /start <userId> or /start channel_{userId}_{channelIndex}
        if (text.startsWith("/start")) {
          const parts = text.split(" ");
          if (parts.length > 1) {
            const param = parts[1];

            await connectToDatabase();

            // Check if it's channel-specific linking
            if (param.startsWith("channel_")) {
              const channelParts = param.split("_");
              if (channelParts.length === 3) {
                const userId = channelParts[1];
                const channelIndex = parseInt(channelParts[2], 10);

                try {
                  const user = await User.findById(userId);
                  const { default: Channel } = await import("@/models/Channel");
                  // Fetch channels sorted by creation time to maintain index consistency
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const channels: any[] = await Channel.find({ userId }).sort({
                    createdAt: 1,
                  });

                  console.log("Channel link attempt:", {
                    userId,
                    channelIndex,
                    userFound: !!user,
                    channelsLength: channels.length,
                    channelExists: !!channels[channelIndex],
                  });

                  if (user && channels[channelIndex]) {
                    const targetChannel = channels[channelIndex];
                    // Detect if group chat
                    const isGroupChat =
                      chat.type === "group" || chat.type === "supergroup";

                    // Update specific channel
                    const currentConfig = targetChannel.config || {};
                    targetChannel.config = {
                      ...currentConfig,
                      chatId: chat.id.toString(),
                      isGroupChat,
                    };

                    await targetChannel.save();

                    const successMessage = isGroupChat
                      ? `✅ *Group Connected Successfully!*\n\n` +
                        `"${targetChannel.name || "Channel"}" is now linked to this group.\n\n` +
                        `🔔 You'll receive filtered notifications here based on your dashboard settings.\n\n` +
                        `💡 Tip: Use /help to see available commands.`
                      : `✅ *Channel Connected Successfully!*\n\n` +
                        `"${targetChannel.name || "Channel"}" is now linked to this chat.\n\n` +
                        `🔔 You'll receive notifications here.\n\n` +
                        `💡 Tip: Use /help to see available commands.`;

                    await sendPlainMessage(successMessage, chat.id.toString());
                    console.log(
                      `Linked Telegram Chat ${chat.id} to User ${userId} Channel ${channelIndex} (${isGroupChat ? "group" : "private"})`,
                    );
                  } else {
                    // More helpful error message
                    const errorDetails = !user
                      ? "User not found"
                      : channels.length === 0
                        ? "No channels created yet"
                        : `Channel ${channelIndex} doesn't exist (you have ${channels.length} channel(s))`;

                    console.error("Channel link failed:", errorDetails);

                    await sendPlainMessage(
                      `❌ Could not find the channel to link.\n\n` +
                        `Debug: ${errorDetails}\n\n` +
                        `Please make sure you:\n` +
                        `1. Created a channel in the dashboard\n` +
                        `2. Clicked "Save Channels" first\n` +
                        `3. Then clicked "Connect with Telegram"`,
                      chat.id.toString(),
                    );
                  }
                } catch (err) {
                  console.error("Error linking channel:", err);
                  await sendPlainMessage(
                    "❌ Invalid link code.",
                    chat.id.toString(),
                  );
                }
              }
            } else {
              // Legacy: User-level linking
              const userId = param;

              try {
                const user = await User.findById(userId);
                if (user) {
                  user.telegramChatId = chat.id.toString();
                  await user.save();

                  await sendPlainMessage(
                    "✅ Successfully connected your Telegram account to Pinga! You will now receive notifications here.\n\n💡 Tip: Use /help for more information.",
                    chat.id.toString(),
                  );
                  console.log(
                    `Linked Telegram Chat ${chat.id} to User ${userId}`,
                  );
                } else {
                  await sendPlainMessage(
                    "❌ Could not find a user account to link. Please try again from the dashboard.",
                    chat.id.toString(),
                  );
                }
              } catch (err) {
                console.error("Error linking user:", err);
                await sendPlainMessage(
                  "❌ Invalid link code.",
                  chat.id.toString(),
                );
              }
            }
          } else {
            // No parameter - show welcome message
            const isGroup = chat.type === "group" || chat.type === "supergroup";
            const welcomeMessage = isGroup
              ? `👋 *Welcome to Pinga!*\n\n` +
                `I'm your developer notification bot.\n\n` +
                `To get started:\n` +
                `1. Visit your Pinga Dashboard\n` +
                `2. Go to Settings → Notification Channels\n` +
                `3. Add a Telegram channel and click "Connect"\n\n` +
                `Use /help to see all available commands.`
              : `👋 *Welcome to Pinga!*\n\n` +
                `I help you receive developer notifications from GitHub, Vercel, Render, and more!\n\n` +
                `To get started, visit your Pinga Dashboard and connect your Telegram account.\n\n` +
                `Use /help to see all available commands.`;

            await sendPlainMessage(welcomeMessage, chat.id.toString());
          }
        } else if (!text.startsWith("/")) {
          // Handle Chat / AI Assistant
          const botUsername = (
            process.env.TELEGRAM_BOT_NAME ||
            process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ||
            "pingapingbot"
          ).toLowerCase();

          const lowerText = text.toLowerCase();
          const isGroup = chat.type === "group" || chat.type === "supergroup";

          let shouldReply = !isGroup; // Always reply in DMs

          // If in group, only reply if mentioned or replying to bot
          if (isGroup) {
            // Check for @mention or reply
            if (lowerText.includes(`@${botUsername}`)) {
              console.log(
                `[Telegram] Bot mentioned in group ${chat.id} (name matched: ${botUsername})`,
              );
              shouldReply = true;
            }
            if (
              update.message.reply_to_message?.from?.username?.toLowerCase() ===
              botUsername
            ) {
              console.log(`[Telegram] Reply to bot in group ${chat.id}`);
              shouldReply = true;
            }
          }

          if (shouldReply) {
            console.log(`[Telegram] Generating AI response for ${chat.id}`);
            const { generateChatResponse } =
              await import("@/lib/agents/chatAssistant");

            // Fetch user history
            let history: ModelMessage[] = [];

            await connectToDatabase();
            // Find user by telegramChatId (legacy) OR check if any channel is linked to this chat
            // For simplicity in MVP, we might only support history for legacy direct linked users or we need to find the user from the channel link.
            // Since we have Channel model, let's try to find the user who owns the channel for this chat.

            // Try to find user directly linked (DM)
            let user: UserDocument | null = await User.findOne({
              telegramChatId: chat.id.toString(),
            });

            if (!user && isGroup) {
              const { default: Channel } = await import("@/models/Channel");
              // find a channel with this config.chatId
              const channel = await Channel.findOne({
                "config.chatId": chat.id.toString(),
              });
              if (channel) {
                user = await User.findById(channel.userId);
              }
            }

            if (user && user.chatHistory) {
              // Map to Vercel AI SDK CoreMessage format
              // The simple schema has role 'user'|'assistant' and content string.
              // Explicitly type msg to avoid implicit any error
              history = user.chatHistory
                .map((msg: { role: string; content: string }) => ({
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                }))
                .slice(-10); // Limit context window
            }

            const senderName = update.message.from?.first_name || "Friend";
            const result = await generateChatResponse({
              message: text,
              senderName,
              history,
              userId: user?._id.toString(),
            });

            console.log("[Telegram Webhook] ChatAssistant Result:", result);

            if (result && result.text) {
              const responseText = result.text;
              await sendPlainMessage(
                responseText,
                chat.id.toString(),
                undefined,
                update.message.message_id,
              );

              // Persist History
              if (user) {
                // We need to type 'user' properly or use updateOne to avoid TS issues if not fully typed here
                await User.updateOne(
                  { _id: user._id },
                  {
                    $push: {
                      chatHistory: {
                        $each: [
                          {
                            role: "user",
                            content: text,
                            createdAt: new Date(),
                          },
                          {
                            role: "assistant",
                            content: responseText,
                            createdAt: new Date(),
                          },
                        ],
                        $slice: -50, // Keep last 50 messages only
                      },
                    },
                  },
                );
              }
            }
          } else if (isGroup) {
            console.log(
              `[Telegram] Group message ignored (no mention): ${text.substring(0, 20)}...`,
            );
          }
        }
      }
    }

    // Handle bot being added to group
    if (update.my_chat_member) {
      const { chat, new_chat_member } = update.my_chat_member;

      // Check if bot was added (status changed to "member" or "administrator")
      if (
        new_chat_member.status === "member" ||
        new_chat_member.status === "administrator"
      ) {
        const welcomeMessage =
          `🎉 *Thanks for adding me to this group!*\n\n` +
          `To start receiving notifications here:\n\n` +
          `1️⃣ Open your Pinga Dashboard\n` +
          `2️⃣ Go to Settings → Notification Channels\n` +
          `3️⃣ Click "Add Telegram"\n` +
          `4️⃣ Click "Connect with Telegram"\n` +
          `5️⃣ The bot will automatically link to this group!\n\n` +
          `💡 You can configure which notifications this group receives in your dashboard.\n\n` +
          `Use /help anytime for assistance.`;

        await sendPlainMessage(welcomeMessage, chat.id.toString());
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
