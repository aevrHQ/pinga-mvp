import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import MagicLinkToken from "@/models/MagicLinkToken";
import { sendMagicLink } from "@/lib/email";
import crypto from "crypto";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
  keepSignedIn: z.boolean().optional(),
  returnTo: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const { email, keepSignedIn, returnTo } = result.data;

    await connectToDatabase();

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Store in DB
    await MagicLinkToken.create({
      email,
      tokenHash,
      otpHash,
      expires,
      keepSignedIn: !!keepSignedIn,
    });

    // Create Link
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    let link = `${baseUrl}/api/auth/magic-link/verify?token=${token}&email=${encodeURIComponent(email)}`;
    if (returnTo) {
      link += `&return_to=${encodeURIComponent(returnTo)}`;
    }

    // Send Email
    await sendMagicLink(email, link, otp);

    return NextResponse.json({ success: true, message: "Magic link sent" });
  } catch (error) {
    console.error("Magic link request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
