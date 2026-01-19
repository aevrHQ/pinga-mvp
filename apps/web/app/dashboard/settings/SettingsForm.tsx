"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

interface SettingsFormProps {
  initialChatId: string;
  initialBotToken: string;
}

export default function SettingsForm({
  initialChatId,
  initialBotToken,
}: SettingsFormProps) {
  const [chatId, setChatId] = useState(initialChatId);
  const [botToken, setBotToken] = useState(initialBotToken);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramChatId: chatId,
          telegramBotToken: botToken,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving settings: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telegram Chat ID
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            placeholder="e.g. 123456789"
          />
          <p className="mt-1 text-xs text-gray-500">
            Send a message to your bot to get your Chat ID.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Bot Token (Optional)
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to use the default system bot.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
        {message && (
          <span
            className={
              message.includes("Error") ? "text-red-600" : "text-green-600"
            }
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
