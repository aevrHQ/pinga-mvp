import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import MagicLinkToken from "@/models/MagicLinkToken";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const magicToken = await MagicLinkToken.findOne({
      email,
      tokenHash,
      used: false,
      expires: { $gt: new Date() },
    });

    if (!magicToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    // Mark as used
    magicToken.used = true;
    await magicToken.save();

    // Find or create User
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
    }

    // Generate JWT
    const payload = { userId: user._id.toString(), email: user.email };
    const maxAge = magicToken.keepSignedIn
      ? 30 * 24 * 60 * 60 // 30 days
      : 24 * 60 * 60; // 1 day

    const jwtToken = signToken(payload, maxAge);

    // Set Cookie
    await setAuthCookie(jwtToken, maxAge);

    // Redirect to dashboard
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
