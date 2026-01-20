import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { z } from "zod";

const channelSchema = z.object({
  type: z.string(),
  config: z.any(),
  enabled: z.boolean(),
  name: z.string().optional(),
});

const preferencesSchema = z.object({
  aiSummary: z.boolean(),
  allowedSources: z.array(z.string()),
});

const settingsSchema = z.object({
  telegramChatId: z.string().optional(),
  telegramBotToken: z.string().optional(),
  channels: z.array(channelSchema).optional(),
  preferences: preferencesSchema.optional(),
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

    const updateData: any = {};
    if (result.data.telegramChatId !== undefined)
      updateData.telegramChatId = result.data.telegramChatId;
    if (result.data.telegramBotToken !== undefined)
      updateData.telegramBotToken = result.data.telegramBotToken;
    if (result.data.channels !== undefined)
      updateData.channels = result.data.channels;
    if (result.data.preferences !== undefined)
      updateData.preferences = result.data.preferences;

    await User.findByIdAndUpdate(user.userId, updateData);

    return NextResponse.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
