import { getCurrentUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import SettingsForm from "./SettingsForm";

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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <SettingsForm
          initialChatId={dbUser?.telegramChatId || ""}
          initialBotToken={dbUser?.telegramBotToken || ""}
        />
      </div>
    </div>
  );
}
