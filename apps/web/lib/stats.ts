import connectToDatabase from "@/lib/mongodb";
import WebhookEvent from "@/models/WebhookEvent";
import Installation from "@/models/Installation";
import { Types } from "mongoose";

export interface DashboardStats {
  totalEvents: number;
  successRate: number;
  failedEvents: number;
  eventsLast24Hours: number;
  topRepositories: { name: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

export async function getUserStats(userId: string): Promise<DashboardStats> {
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);

  // 1. Get user's installation IDs
  const installations = await Installation.find({ userId: userObjectId });
  const installationIds = installations.map((i) => i.installationId);

  if (installationIds.length === 0) {
    return {
      totalEvents: 0,
      successRate: 0,
      failedEvents: 0,
      eventsLast24Hours: 0,
      topRepositories: [],
      dailyActivity: [],
    };
  }

  // 2. Base match for all queries
  const baseMatch = {
    "payload.installation.id": { $in: installationIds },
  };

  // 3. Aggregate stats
  const [totalCount, failedCount, last24HoursCount, topRepos, dailyActivity] =
    await Promise.all([
      // Total Events
      WebhookEvent.countDocuments(baseMatch),

      // Failed Events
      WebhookEvent.countDocuments({ ...baseMatch, status: "failed" }),

      // Events Last 24 Hours
      WebhookEvent.countDocuments({
        ...baseMatch,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),

      // Top Repositories
      WebhookEvent.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: "$payload.repository.full_name",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $project: {
            name: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]),

      // Daily Activity (Last 7 Days)
      WebhookEvent.aggregate([
        {
          $match: {
            ...baseMatch,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]),
    ]);

  const successRate =
    totalCount > 0 ? ((totalCount - failedCount) / totalCount) * 100 : 100;

  return {
    totalEvents: totalCount,
    successRate: Math.round(successRate * 10) / 10,
    failedEvents: failedCount,
    eventsLast24Hours: last24HoursCount,
    topRepositories: topRepos,
    dailyActivity: dailyActivity,
  };
}
