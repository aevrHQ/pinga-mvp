import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { sendMessage } from "@/lib/webhook/telegram";

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

      // Handle /start <userId>
      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        if (parts.length > 1) {
          const userId = parts[1];
          // Format of userId should be validated (OrbitId/MongoId)

          await connectToDatabase();

          // SECURITY: Link this chat ID to the user with this ID.
          // In a real app complexity, we might use a temporary "link token" instead of raw userId
          // to prevent random guessing, but for MVP userId is obscure enough if it's an ObjectId.

          try {
            const user = await User.findById(userId);
            if (user) {
              user.telegramChatId = chat.id.toString();
              await user.save();

              await sendMessage(
                "✅ Successfully connected your Telegram account to Pinga! You will now receive notifications here.",
                {},
                chat.id.toString(),
              );
              console.log(`Linked Telegram Chat ${chat.id} to User ${userId}`);
            } else {
              await sendMessage(
                "❌ Could not find a user account to link. Please try again from the dashboard.",
                {},
                chat.id.toString(),
              );
            }
          } catch (err) {
            console.error("Error linking user:", err);
            await sendMessage("❌ Invalid link code.", {}, chat.id.toString());
          }
        } else {
          await sendMessage(
            "👋 Hello! To connect your account, please use the link provided in your Pinga Dashboard.",
            {},
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
