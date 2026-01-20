import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import MagicLinkToken from "@/models/MagicLinkToken";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";
import crypto from "crypto";
import { z } from "zod";

const verifySchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().length(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      console.warn("OTP Verification: Invalid input format", result.error);
      return NextResponse.json(
        { error: "Invalid email or code format" },
        { status: 400 },
      );
    }

    const { email, otp } = result.data;

    await connectToDatabase();

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Masked logging
    const maskedEmail = email.replace(/(^.{2})[^@]+(@.+)/, "$1***$2");
    console.log(
      `[OTP] Verifying for ${maskedEmail}. Hash: ${otpHash.substring(0, 8)}...`,
    );

    // Find valid token
    const magicToken = await MagicLinkToken.findOne({
      email,
      otpHash,
    });

    if (!magicToken) {
      console.warn(
        `[OTP] Failed: No token found for ${maskedEmail} with provided code.`,
      );
      // Security: Don't reveal if it was the code or the email that was wrong,
      // but log it for us.
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    if (magicToken.used) {
      console.warn(`[OTP] Failed: Token already used for ${maskedEmail}.`);
      return NextResponse.json(
        { error: "Code already used. Please request a new one." },
        { status: 400 },
      );
    }

    if (new Date() > magicToken.expires) {
      console.warn(`[OTP] Failed: Token expired for ${maskedEmail}.`);
      return NextResponse.json(
        { error: "Code expired. Please request a new one." },
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
