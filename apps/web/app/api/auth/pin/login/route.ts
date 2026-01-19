import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";
import crypto from "crypto";
import { z } from "zod";

const pinLoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().length(4), // Assuming 4-digit PIN for now
  keepSignedIn: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = pinLoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid email or PIN format" },
        { status: 400 },
      );
    }

    const { email, pin, keepSignedIn } = result.data;

    await connectToDatabase();

    // Hash valid PIN input
    const pinHash = crypto.createHash("sha256").update(pin).digest("hex");

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or PIN" }, // Ambiguous error for security
        { status: 401 },
      );
    }

    // Check if user has a PIN set
    if (!user.pin) {
      return NextResponse.json(
        { error: "PIN not set up for this account. Please use Magic Link." },
        { status: 401 },
      );
    }

    // Validate PIN
    if (user.pin !== pinHash) {
      return NextResponse.json(
        { error: "Invalid email or PIN" },
        { status: 401 },
      );
    }

    // Generate JWT
    const payload = { userId: user._id.toString(), email: user.email };
    const maxAge = keepSignedIn
      ? 30 * 24 * 60 * 60 // 30 days
      : 24 * 60 * 60; // 1 day

    const jwtToken = signToken(payload, keepSignedIn ? "30d" : "1d");
    await setAuthCookie(jwtToken, maxAge);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PIN Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
