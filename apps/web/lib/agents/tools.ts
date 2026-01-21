import { z } from "zod";
import { tool } from "ai";
import { getCurrentUser } from "@/lib/auth";
import { getUserStats } from "@/lib/stats";
import connectToDatabase from "@/lib/mongodb";
import Installation from "@/models/Installation";
import WebhookEvent from "@/models/WebhookEvent";
import User from "@/models/User";
import Channel from "@/models/Channel";
import { Types, FilterQuery } from "mongoose";

// --- Stats & Activity Tools ---

const noParamsSchema = z.object({});

async function getAuthorizedUserId(contextUserId?: string) {
  if (contextUserId) return contextUserId;
  const user = await getCurrentUser();
  return user?.userId;
}

export const createDashboardTools = (context: { userId?: string } = {}) => {
  return {
    getDashboardStats: tool({
      description:
        "Get aggregated statistics for the user's dashboard (total events, success rate, etc.)",
      inputSchema: noParamsSchema,
      execute: async () => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        return await getUserStats(userId);
      },
    }),

    getRecentActivity: tool({
      description: "Get a list of recent webhook events/activity logs.",
      inputSchema: z.object({
        limit: z.number().optional().default(20),
        status: z
          .enum(["pending", "processed", "failed", "ignored"])
          .optional(),
      }),
      execute: async ({ limit, status }) => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();

        const installations = await Installation.find({
          userId: new Types.ObjectId(userId),
        });
        const installationIds = installations.map((i) => i.installationId);

        if (installationIds.length === 0) return { events: [] };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: FilterQuery<any> = {
          "payload.installation.id": { $in: installationIds },
        };
        if (status) query.status = status;

        const events = await WebhookEvent.find(query)
          .sort({ createdAt: -1 })
          .limit(limit || 20);

        return {
          events: events.map((e) => ({
            id: e._id.toString(),
            event: e.event,
            source: e.source,
            status: e.status,
            createdAt: e.createdAt,
            repo: e.payload?.repository?.full_name,
          })),
        };
      },
    }),

    getInstallations: tool({
      description: "Get a list of connected GitHub installations/accounts.",
      inputSchema: noParamsSchema,
      execute: async () => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();
        const installations = await Installation.find({
          userId: new Types.ObjectId(userId),
        });

        return {
          installations: installations.map((i) => ({
            installationId: i.installationId,
            accountLogin: i.accountLogin,
            accountType: i.accountType,
            repositorySelection: i.repositorySelection,
          })),
        };
      },
    }),

    // --- Settings Tools ---

    getNotificationChannels: tool({
      description: "Get the user's configured notification channels.",
      inputSchema: noParamsSchema,
      execute: async () => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();
        const channels = await Channel.find({
          userId: new Types.ObjectId(userId),
        }).lean();

        return { channels: JSON.parse(JSON.stringify(channels)) };
      },
    }),

    addNotificationChannel: tool({
      description: "Add a new notification channel.",
      inputSchema: z.object({
        type: z.enum(["telegram", "discord", "slack", "email", "webhook"]),
        name: z.string().describe("Friendly name for the channel"),
        config: z
          .record(z.string(), z.any())
          .describe("Configuration object (e.g. webhookUrl, chatId)"),
      }),
      execute: async ({ type, name, config }) => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();
        const channel = new Channel({
          userId: new Types.ObjectId(userId),
          type,
          name,
          config,
          enabled: true,
        });
        await channel.save();

        return {
          success: true,
          channel: JSON.parse(JSON.stringify(channel.toObject())),
        };
      },
    }),

    updateNotificationChannel: tool({
      description:
        "Update an existing notification channel configuration or filters.",
      inputSchema: z.object({
        channelId: z.string(),
        updates: z.object({
          name: z.string().optional(),
          enabled: z.boolean().optional(),
          config: z.record(z.string(), z.any()).optional(),
          webhookRules: z
            .object({
              sources: z.array(
                z.object({
                  type: z.string(),
                  enabled: z.boolean(),
                  filters: z
                    .object({
                      repositories: z.array(z.string()).optional(),
                      eventTypes: z.array(z.string()).optional(),
                      services: z.array(z.string()).optional(),
                    })
                    .optional(),
                }),
              ),
            })
            .optional(),
        }),
      }),
      execute: async ({ channelId, updates }) => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();
        const channel = await Channel.findOneAndUpdate(
          { _id: channelId, userId: new Types.ObjectId(userId) },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { $set: updates } as any,
          { new: true },
        ).lean();

        if (!channel) return { error: "Channel not found" };
        return {
          success: true,
          channel: JSON.parse(JSON.stringify(channel)),
        };
      },
    }),

    deleteNotificationChannel: tool({
      description: "Delete a notification channel.",
      inputSchema: z.object({
        channelId: z.string(),
      }),
      execute: async ({ channelId }) => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();
        await Channel.deleteOne({
          _id: channelId,
          userId: new Types.ObjectId(userId),
        });
        return { success: true };
      },
    }),

    getUserPreferences: tool({
      description: "Get user preferences (e.g. AI summary settings).",
      inputSchema: noParamsSchema,
      execute: async () => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();
        const userDoc = await User.findById(userId).lean();
        return { preferences: userDoc?.preferences || {} };
      },
    }),

    updateUserPreferences: tool({
      description: "Update user preferences.",
      inputSchema: z.object({
        aiSummary: z.boolean().optional(),
        allowedSources: z.array(z.string()).optional(),
      }),
      execute: async (updates) => {
        const userId = await getAuthorizedUserId(context.userId);
        if (!userId) return { error: "Unauthorized" };

        await connectToDatabase();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateQuery: Record<string, any> = {};
        if (updates.aiSummary !== undefined)
          updateQuery["preferences.aiSummary"] = updates.aiSummary;
        if (updates.allowedSources !== undefined)
          updateQuery["preferences.allowedSources"] = updates.allowedSources;

        if (Object.keys(updateQuery).length > 0) {
          await User.findByIdAndUpdate(userId, { $set: updateQuery });
        }

        return { success: true };
      },
    }),
  };
};

export const dashboardTools = createDashboardTools();
