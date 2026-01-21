import { getUserStats } from "@/lib/stats";
import { getCurrentUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Installation from "@/models/Installation";
import WebhookEvent from "@/models/WebhookEvent";
import {
  Plus,
  Github,
  Activity,
  CheckCircle,
  BarChart3,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Types } from "mongoose";

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const searchParams = await props.searchParams;
  const installationId = searchParams.installation_id;
  const setupAction = searchParams.setup_action;

  await connectToDatabase();

  // Handle Installation Linking
  let successMessage = "";
  if (
    installationId &&
    (setupAction === "install" || setupAction === "update")
  ) {
    const id = parseInt(
      Array.isArray(installationId) ? installationId[0] : installationId,
      10,
    );
    if (!isNaN(id)) {
      // Find the installation (it should have been created by the webhook)
      // We look for one with the matching ID.
      // If it has no userId, we claim it.
      // If it has THIS user's userId, we ignore (already linked).
      // If it has ANOTHER user's userId, we error (security).

      const installation = await Installation.findOne({ installationId: id });

      if (installation) {
        if (!installation.userId) {
          installation.userId = new Types.ObjectId(user.userId);
          await installation.save();
          successMessage = "Successfully connected GitHub account!";
        } else if (installation.userId.toString() === user.userId) {
          successMessage = "Account is already connected.";
        } else {
          console.warn(
            "Attempt to claim installation belonging to another user",
          );
        }
      } else {
        // Installation not found yet (maybe webhook is slow?)
        // In a clearer flow, we might wait or retry, but for MVP we just show nothing
      }
    }
  }

  // Fetch linked installations
  const installations = await Installation.find({
    userId: new Types.ObjectId(user.userId),
  });

  // Fetch stats and events
  const stats = await getUserStats(user.userId);

  // Still fetch recent events for the list view
  const installationIds = installations.map((i) => i.installationId);
  const events =
    installationIds.length > 0
      ? await WebhookEvent.find({
          "payload.installation.id": { $in: installationIds },
        })
          .sort({ createdAt: -1 })
          .limit(10)
      : [];

  const githubAppName = process.env.GITHUB_APP_NAME || "trypinga";
  const githubInstallUrl = `https://github.com/apps/${githubAppName}/installations/new`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-gray-500">Welcome to your dashboard</p>
        </div>
        <a
          href={githubInstallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </a>
      </div>

      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 border border-green-100">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {installationId && !successMessage && (
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg flex items-start gap-2 border border-yellow-100">
          <Activity className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">Connection Pending...</p>
            <p className="text-sm mt-1">
              We received the redirect from GitHub (ID:{" "}
              {Array.isArray(installationId)
                ? installationId[0]
                : installationId}
              ), but we haven&apos;t received the configuration data yet.
            </p>
            <p className="text-sm mt-2">
              <strong>Troubleshooting:</strong>
              <br />
              1. Ensure your GitHub App <strong>Webhook URL</strong> is set to{" "}
              <code>https://&lt;your-ngrok-url&gt;/api/webhook/github</code>.
              <br />
              2. Ensure <strong>Content type</strong> is{" "}
              <code>application/json</code>.<br />
              3. Check your terminal to see if the webhook was received.
            </p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Events (24h)</h3>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.eventsLast24Hours}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
            <Zap className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.successRate}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Failed</h3>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.failedEvents}
          </p>
        </div>
      </div>

      {/* Stats / Installations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Github className="w-5 h-5 text-gray-700" />
              Connected Accounts
            </h2>
            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {installations.length}
            </span>
          </div>

          {installations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No GitHub accounts connected yet.</p>
              <a
                href={githubInstallUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Install the GitHub App to get started
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {installations.map((inst) => (
                <div
                  key={inst.installationId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-200 text-xs font-bold">
                      {(inst.accountLogin[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {inst.accountLogin}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {inst.accountType}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {inst.installationId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              Recent Activity
            </h2>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No recent webhooks received.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <div
                  key={String(evt._id)}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 mt-2 rounded-full ${evt.status === "processed" ? "bg-green-500" : "bg-yellow-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {evt.event}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(evt.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <div className="text-4xl">📚</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Need Help Getting Started?
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Check out our guides to make the most of Pinga
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/help/getting-started"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
              >
                🚀 Getting Started
              </a>
              <a
                href="/help/telegram-groups"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
              >
                👥 Telegram Groups
              </a>
              <a
                href="/help/filtering"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
              >
                🎯 Webhook Filtering
              </a>
              <a
                href="/help/sources"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white px-4 py-2 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
              >
                🔗 Webhook Sources
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
