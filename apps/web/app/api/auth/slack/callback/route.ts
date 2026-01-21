import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=slack_auth_${error}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=missing_params", request.url),
    );
  }

  // State format: "channel_{userId}_{channelIndex}"
  // Verify format
  const parts = state.split("_");
  if (parts.length !== 3 || parts[0] !== "channel") {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=invalid_state", request.url),
    );
  }

  const userId = parts[1];
  const channelIndex = parseInt(parts[2], 10);

  try {
    // Exchange code for token
    const formData = new URLSearchParams();
    formData.append("client_id", process.env.SLACK_CLIENT_ID || "");
    formData.append("client_secret", process.env.SLACK_CLIENT_SECRET || "");
    formData.append("code", code);
    // Redirect URI must match exactly what was sent in the authorize request
    // We construct it dynamically based on the request URL
    const redirectUri = `${request.nextUrl.origin}/api/auth/slack/callback`;
    formData.append("redirect_uri", redirectUri);

    const checkResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    const data = await checkResponse.json();

    if (!data.ok) {
      console.error("Slack OAuth Error:", data.error);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?error=slack_api_${data.error}`,
          request.url,
        ),
      );
    }

    // Connect to DB and update Channel
    await connectToDatabase();
    const { default: Channel } = await import("@/models/Channel");

    // Fetch channels for this user to find the correct index
    // Note: This relies on the index being stable between the "Add Channel" click and the callback.
    // Ideally we would use a temporary ID, but sticking to the Telegram pattern for now.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channels: any[] = await Channel.find({ userId }).sort({
      createdAt: 1,
    });

    if (!channels[channelIndex]) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=channel_not_found", request.url),
      );
    }

    const targetChannel = channels[channelIndex];

    // Store relevant info
    // data.incoming_webhook might be undefined if scopes don't include incoming-webhook
    // but we requested it.

    const webhookUrl = data.incoming_webhook?.url;
    const channelName = data.incoming_webhook?.channel;
    const teamName = data.team?.name;

    // We also get an access_token that can be used for chat:write
    // data.access_token

    targetChannel.config = {
      ...targetChannel.config,
      webhookUrl,
      accessToken: data.access_token,
      channelName,
      teamName,
      teamId: data.team?.id,
      scope: data.scope,
    };

    // Update the friendly name if it was the default
    if (targetChannel.name === "My Slack Channel") {
      targetChannel.name = `Slack: ${channelName || teamName}`;
    }

    await targetChannel.save();

    return NextResponse.redirect(
      new URL("/dashboard/settings?success=slack_connected", request.url),
    );
  } catch (err) {
    console.error("Slack Callback Error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=internal_error", request.url),
    );
  }
}
