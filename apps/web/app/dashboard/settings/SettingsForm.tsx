"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

interface SettingsFormProps {
  initialChatId: string;
  initialBotToken: string;
  userId: string;
}

export default function SettingsForm({
  initialChatId,
  initialBotToken,
  userId,
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

          <div className="mt-3">
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "pingapingbot"}?start=${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.55-1.06-.7-.37-1.09.22-1.7.15-.16 2.86-2.61 2.91-2.83.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.91 1.2-5.39 3.56-.51.35-.97.52-1.38.51-.45-.01-1.32-.26-1.96-.46-.79-.25-1.41-.38-1.36-.8.03-.22.33-.44.91-.67 3.55-1.54 5.92-2.56 7.1-3.08 3.37-1.47 4.07-1.78 4.54-1.78.1 0 .34.02.49.14.12.1.15.24.16.34 0 .07 0 .21-.01.31z" />
              </svg>
              Connect with One Click
            </a>
            <p className="text-[10px] text-gray-400 mt-1">
              (Requires you to set up the Telegram Webhook)
            </p>
          </div>
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
