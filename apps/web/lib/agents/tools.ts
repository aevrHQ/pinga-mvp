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

export const getDashboardStats = tool({
  description:
    "Get aggregated statistics for the user's dashboard (total events, success rate, etc.)",
  inputSchema: noParamsSchema,
  execute: async () => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    return await getUserStats(user.userId);
  },
});

const getRecentActivitySchema = z.object({
  limit: z.number().optional().default(20),
  status: z.enum(["pending", "processed", "failed", "ignored"]).optional(),
});

export const getRecentActivity = tool({
  description: "Get a list of recent webhook events/activity logs.",
  inputSchema: getRecentActivitySchema,
  execute: async ({
    limit,
    status,
  }: z.infer<typeof getRecentActivitySchema>) => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();

    const installations = await Installation.find({
      userId: new Types.ObjectId(user.userId),
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
});

export const getInstallations = tool({
  description: "Get a list of connected GitHub installations/accounts.",
  inputSchema: noParamsSchema,
  execute: async () => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();
    const installations = await Installation.find({
      userId: new Types.ObjectId(user.userId),
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
});

// --- Settings Tools ---

export const getNotificationChannels = tool({
  description: "Get the user's configured notification channels.",
  inputSchema: noParamsSchema,
  execute: async () => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();
    const channels = await Channel.find({
      userId: new Types.ObjectId(user.userId),
    }).lean();

    return { channels: JSON.parse(JSON.stringify(channels)) };
  },
});

const addChannelSchema = z.object({
  type: z.enum(["telegram", "discord", "slack", "email"]),
  name: z.string().describe("Friendly name for the channel"),
  config: z
    .record(z.string(), z.any())
    .describe("Configuration object (e.g. webhookUrl, chatId)"),
});

export const addNotificationChannel = tool({
  description: "Add a new notification channel.",
  inputSchema: addChannelSchema,
  execute: async ({ type, name, config }: z.infer<typeof addChannelSchema>) => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();
    const channel = new Channel({
      userId: new Types.ObjectId(user.userId),
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
});

const updateChannelSchema = z.object({
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
});

export const updateNotificationChannel = tool({
  description:
    "Update an existing notification channel configuration or filters.",
  inputSchema: updateChannelSchema,
  execute: async ({
    channelId,
    updates,
  }: z.infer<typeof updateChannelSchema>) => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();
    // Use casting to avoid strict UpdateQuery type mismatch if necessary, or just simple object
    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, userId: new Types.ObjectId(user.userId) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $set: updates } as any,
      { new: true },
    ).lean();

    if (!channel) return { error: "Channel not found" };
    return { success: true, channel: JSON.parse(JSON.stringify(channel)) };
  },
});

const deleteChannelSchema = z.object({
  channelId: z.string(),
});

export const deleteNotificationChannel = tool({
  description: "Delete a notification channel.",
  inputSchema: deleteChannelSchema,
  execute: async ({ channelId }: z.infer<typeof deleteChannelSchema>) => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();
    await Channel.deleteOne({
      _id: channelId,
      userId: new Types.ObjectId(user.userId),
    });
    return { success: true };
  },
});

export const getUserPreferences = tool({
  description: "Get user preferences (e.g. AI summary settings).",
  inputSchema: noParamsSchema,
  execute: async () => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();
    const userDoc = await User.findById(user.userId).lean();
    return { preferences: userDoc?.preferences || {} };
  },
});

const updatePreferencesSchema = z.object({
  aiSummary: z.boolean().optional(),
  allowedSources: z.array(z.string()).optional(),
});

export const updateUserPreferences = tool({
  description: "Update user preferences.",
  inputSchema: updatePreferencesSchema,
  execute: async (updates: z.infer<typeof updatePreferencesSchema>) => {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQuery: Record<string, any> = {};
    if (updates.aiSummary !== undefined)
      updateQuery["preferences.aiSummary"] = updates.aiSummary;
    if (updates.allowedSources !== undefined)
      updateQuery["preferences.allowedSources"] = updates.allowedSources;

    if (Object.keys(updateQuery).length > 0) {
      await User.findByIdAndUpdate(user.userId, { $set: updateQuery });
    }

    return { success: true };
  },
});

export const dashboardTools = {
  getDashboardStats,
  getRecentActivity,
  getInstallations,
  getNotificationChannels,
  addNotificationChannel,
  updateNotificationChannel,
  deleteNotificationChannel,
  getUserPreferences,
  updateUserPreferences,
};
