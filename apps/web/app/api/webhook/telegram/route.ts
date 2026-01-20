import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { sendPlainMessage } from "@/lib/webhook/telegram";

// This route receives webhooks FROM Telegram
// You need to set your telegram bot webhook to point here:
// https://<your-domain>/api/webhook/telegram
// URL: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/webhook/telegram

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Check if it's a message
    if (update.message && update.message.text) {
      const { text, chat } = update.message;

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
                if (user && user.channels && user.channels[channelIndex]) {
                  // Detect if group chat
                  const isGroupChat =
                    chat.type === "group" || chat.type === "supergroup";

                  // Update specific channel
                  const currentConfig =
                    (user.channels[channelIndex].config as Record<
                      string,
                      unknown
                    >) || {};
                  user.channels[channelIndex].config = {
                    ...currentConfig,
                    chatId: chat.id.toString(),
                    isGroupChat,
                  };

                  await user.save();

                  await sendPlainMessage(
                    `✅ Successfully connected "${user.channels[channelIndex].name || "Channel"}" to this ${isGroupChat ? "group" : "chat"}! You will now receive filtered notifications here.`,
                    chat.id.toString(),
                  );
                  console.log(
                    `Linked Telegram Chat ${chat.id} to User ${userId} Channel ${channelIndex} (${isGroupChat ? "group" : "private"})`,
                  );
                } else {
                  await sendPlainMessage(
                    "❌ Could not find the channel to link. Please try again from the dashboard.",
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
                  "✅ Successfully connected your Telegram account to Pinga! You will now receive notifications here.",
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
          await sendPlainMessage(
            "👋 Hello! To connect your account, please use the link provided in your Pinga Dashboard.",
            chat.id.toString(),
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
