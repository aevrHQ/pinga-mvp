import { getCurrentUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import SettingsForm from "./SettingsForm";

import PinSettingsForm from "./PinSettingsForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectToDatabase();
  const dbUser = await User.findById(user.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your notification preferences</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Telegram Configuration</h2>
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
