import { NextRequest, NextResponse } from "next/server";
import { analyzeWebhook } from "@/lib/webhook/analyzers";
import { storePayload, getPayloadUrl } from "@/lib/webhook/storage";
import { sendNotification } from "@/lib/webhook/telegram";
import { validateConfig } from "@/lib/webhook/config";
import connectToDatabase from "@/lib/mongodb";
import Installation from "@/models/Installation";
import User from "@/models/User";
import WebhookEvent from "@/models/WebhookEvent";

interface RouteParams {
  params: Promise<{ source: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { source } = await params;

  // Validate global config (fallback)
  const { valid, errors } = validateConfig();
  // We allow proceeding even if global config is missing, because we might use user-specific config
  // But we log it
  if (!valid) {
    console.warn("Global config validation warnings:", errors);
  }

  try {
    // Parse webhook payload
    const payload = await request.json();

    // Get headers as plain object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    await connectToDatabase();

    // Log event
    const eventType = headers["x-github-event"] || "unknown";
    await WebhookEvent.create({
      source,
      event: eventType,
      payload,
      status: "pending",
    });

    // Store payload (legacy/file storage) - keeping this for now as it gives a public URL
    const payloadId = storePayload(source, payload);
    const payloadUrl = getPayloadUrl(payloadId);

    // Analyze the webhook
    const result = analyzeWebhook(payload, headers, source);

    // --- Multi-tenancy Logic ---

    // Handle Installation Events
    if (
      eventType === "installation" ||
      eventType === "installation_repositories"
    ) {
      await handleInstallationEvent(payload, eventType);
      // We still notify about installation events, but to whom?
      // For now, if it's a new installation, we might not have a user link yet unless we implement a setup flow
      // where they install the app FROM the dashboard.
      // Assuming the user installed the app, we need to find who owns this installation.
      // GitHub sends `sender` which is the user who triggered the action.

      // TODO: In a real app, you'd verify the `sender.id` matches a User in your DB
      // or rely on the `state` parameter if this was part of an OAuth flow.
      // For MVP, if we know the user's GitHub username, we could link it.
      // Or we just log it for now.
    }

    // Determine Recipient
    let chatId = process.env.TELEGRAM_CHAT_ID; // Default global
    let botToken = process.env.TELEGRAM_BOT_TOKEN; // Default global

    const installationId = payload.installation?.id;

    if (installationId) {
      const installation = await Installation.findOne({
        installationId,
      }).populate("userId");

      if (installation && installation.userId) {
        // We found a linked installation!
        const user = installation.userId as any; // populated
        if (user.telegramChatId) {
          chatId = user.telegramChatId;
        }
        if (user.telegramBotToken) {
          botToken = user.telegramBotToken;
        }
        console.log(
          `Routing webhook ${eventType} to User ${user.email} (ChatID: ${chatId})`,
        );
      } else {
        console.warn(
          `No installation found for ID ${installationId}, using default config if available.`,
        );
      }
    }

    // Send Telegram notification
    let sent = false;
    if (chatId && botToken) {
      sent = await sendNotification({
        ...result.notification,
        payloadUrl,
        chatId,
        botToken,
      });
    } else {
      console.warn("Skipping notification: Missing Chat ID or Bot Token");
    }

    return NextResponse.json({
      success: true,
      source: result.source,
      sourceHint: source,
      payloadId,
      payloadUrl,
      telegramSent: sent,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook", details: String(error) },
      { status: 500 },
    );
  }
}

async function handleInstallationEvent(payload: any, eventType: string) {
  const installationId = payload.installation.id;
  const action = payload.action;

  if (eventType === "installation") {
    if (action === "created") {
      // New installation
      const accountLogin = payload.installation.account.login;
      const accountId = payload.installation.account.id;
      const accountType = payload.installation.account.type;
      const senderLogin = payload.sender.login;

      console.log(
        `New Installation ${installationId} for ${accountLogin} by ${senderLogin}`,
      );

      // Try to find a user who matches the sender
      // NOTE: This assumes the GitHub username is stored in our User model, OR we trust the sender.
      // Since we don't have GitHub OAuth login fully linked to usernames yet (we used Email magic link),
      // we can't automatically link unless we ask the user to input their GitHub username.
      //
      // FOR MVP: We will create the Installation record but leave userId null/orphaned
      // until we claim it via the Dashboard.

      await Installation.create({
        installationId,
        accountLogin,
        accountId,
        accountType,
        repositorySelection: payload.installation.repository_selection,
        // userId: ??? -> To be linked
      }).catch((err) => console.error("Error creating installation:", err));
    } else if (action === "deleted") {
      // Uninstall
      await Installation.deleteOne({ installationId });
    }
  }
}
