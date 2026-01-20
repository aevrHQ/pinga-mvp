import { NextRequest, NextResponse } from "next/server";
import { analyzeWebhook } from "@/lib/webhook/analyzers";
import { storePayload, getPayloadUrl } from "@/lib/webhook/storage";
import { validateConfig } from "@/lib/webhook/config";
import connectToDatabase from "@/lib/mongodb";
import Installation from "@/models/Installation";
import User, { UserDocument } from "@/models/User";
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

    // Determine Recipient User
    let targetUser: UserDocument | null = null;

    const installationId = payload.installation?.id;

    if (installationId) {
      const installation = await Installation.findOne({
        installationId,
      }).populate("userId");

      if (installation && installation.userId) {
        targetUser = installation.userId as unknown as UserDocument;
        console.log(
          `Routing webhook ${eventType} to User ${targetUser?.email}`,
        );
      } else {
        console.warn(
          `No installation found for ID ${installationId}, using default config if available.`,
        );
      }
    }

    // Handle generic SaaS Webhooks (e.g. Render) via ?userId=...
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (userId && !installationId) {
      try {
        const user = await User.findById(userId);
        if (user) {
          targetUser = user;
          console.log(
            `Routing webhook ${source} to User ${user.email} (via userId param)`,
          );
        }
      } catch (e) {
        console.error("Invalid userId in webhook params", e);
      }
    }

    // Send Notification
    let sent = false;
    if (targetUser) {
      // 1. Generate AI Summary if enabled
      let aiSummary: string | undefined;

      // Check if AI summary is enabled in preferences
      // Note: We need to ensure preferences is populated or exists (schema default handles this)
      if (targetUser.preferences?.aiSummary) {
        try {
          const { generateEventSummary } =
            await import("@/lib/agents/eventSummary");

          console.log("Generating AI summary...");
          aiSummary = await generateEventSummary({
            eventType: eventType !== "unknown" ? eventType : "webhook",
            source,
            payload,
          });
        } catch (error) {
          console.error("AI Summary Generation Failed:", error);
          // Non-blocking
        }
      }

      // 2. Dispatch via Notification Service
      const { notificationService } =
        await import("@/lib/notification/service");

      sent = await notificationService.send(targetUser, {
        ...result.notification,
        payloadUrl,
        source,
        eventType,
        summary: aiSummary,
        rawPayload: payload,
      });
    } else {
      // Legacy Global Fallback (optional, but requested to keep backward compat if user not found?)
      // Current logic relied on Env vars if user not found.
      // But NotificationService requires a User object to determine channels.
      // If no user found, maybe we shouldn't send?
      // Original code: `if (chatId && botToken) ...` (where chatId came from ENV or user).
      // Let's try to construct a dummy user for global fallback if ENV vars exist.
      if (process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_BOT_TOKEN) {
        const { notificationService } =
          await import("@/lib/notification/service");
        // Create a fake user context for global env dispatch
        const globalUser = {
          telegramChatId: process.env.TELEGRAM_CHAT_ID,
          telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
          channels: [],
          preferences: {},
        } as any;

        sent = await notificationService.send(globalUser, {
          ...result.notification,
          payloadUrl,
          source,
          eventType,
        });
      } else {
        console.warn(
          "Skipping notification: No target user and no global config",
        );
      }
    }

    return NextResponse.json({
      success: true,
      source: result.source,
      sourceHint: source,
      payloadId,
      payloadUrl,
      telegramSent: sent, // Field name kept for Compat, but means "notificationSent"
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook", details: String(error) },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
