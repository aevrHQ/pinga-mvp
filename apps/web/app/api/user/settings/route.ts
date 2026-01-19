import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { z } from "zod";

const settingsSchema = z.object({
  telegramChatId: z.string().optional(),
  telegramBotToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = settingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(user.userId, {
      telegramChatId: result.data.telegramChatId,
      telegramBotToken: result.data.telegramBotToken,
    });

    return NextResponse.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
