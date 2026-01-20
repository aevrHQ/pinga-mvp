import { getCurrentUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import SettingsForm from "./SettingsForm";
import PinSettingsForm from "./PinSettingsForm";
import NotificationChannelsForm from "./NotificationChannelsForm";
import PreferencesForm from "./PreferencesForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectToDatabase();
  const dbUser = await User.findById(user.userId);

  // Serialize to plain objects
  const channels = dbUser?.channels
    ? JSON.parse(JSON.stringify(dbUser.channels))
    : [];
  const preferences = dbUser?.preferences
    ? JSON.parse(JSON.stringify(dbUser.preferences))
    : { aiSummary: false, allowedSources: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your notification preferences</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Notification Channels</h2>
          <p className="text-sm text-gray-500 mb-4">
            Configure where you want to receive notifications
          </p>
          <NotificationChannelsForm
            initialChannels={channels}
            userId={user.userId.toString()}
          />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Preferences</h2>
          <p className="text-sm text-gray-500 mb-4">
            Customize how you receive notifications
          </p>
          <PreferencesForm initialPreferences={preferences} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">
            Legacy Telegram Configuration
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This is kept for backward compatibility. Use the Notification
            Channels section above for new setup.
          </p>
          <SettingsForm
            initialChatId={dbUser?.telegramChatId || ""}
            initialBotToken={dbUser?.telegramBotToken || ""}
            userId={user.userId.toString()}
          />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          <PinSettingsForm />
        </div>
      </div>
    </div>
  );
}
