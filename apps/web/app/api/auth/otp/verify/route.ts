import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import MagicLinkToken from "@/models/MagicLinkToken";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";
import crypto from "crypto";
import { z } from "zod";

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid email or code" },
        { status: 400 },
      );
    }

    const { email, otp } = result.data;

    await connectToDatabase();

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Find valid token
    const magicToken = await MagicLinkToken.findOne({
      email,
      otpHash,
      used: false,
      expires: { $gt: new Date() },
    });

    if (!magicToken) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    // Mark used
    magicToken.used = true;
    await magicToken.save();

    // Find/Create User
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
    }

    // Generate JWT
    const payload = { userId: user._id.toString(), email: user.email };
    const maxAge = magicToken.keepSignedIn
      ? 30 * 24 * 60 * 60 // 30 days
      : 24 * 60 * 60; // 1 day

    const jwtToken = signToken(payload, "1d"); // Expires in 1 day for standard session
    await setAuthCookie(jwtToken, maxAge);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
