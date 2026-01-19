import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";
import { z } from "zod";

const setPinSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, "PIN must be numeric"),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = setPinSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 },
      );
    }

    const { pin } = result.data;

    await connectToDatabase();

    // Hash the PIN
    const pinHash = crypto.createHash("sha256").update(pin).digest("hex");

    // Update User
    await User.findByIdAndUpdate(user.userId, { pin: pinHash });

    return NextResponse.json({
      success: true,
      message: "PIN set successfully",
    });
  } catch (error) {
    console.error("Set PIN Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
