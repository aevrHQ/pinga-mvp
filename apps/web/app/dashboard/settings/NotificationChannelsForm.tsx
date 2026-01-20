"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

interface Channel {
  type: string;
  config: any;
  enabled: boolean;
  name?: string;
}

interface NotificationChannelsFormProps {
  initialChannels: Channel[];
  userId: string;
}

export default function NotificationChannelsForm({
  initialChannels,
  userId,
}: NotificationChannelsFormProps) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const addChannel = (type: string) => {
    const newChannel: Channel = {
      type,
      config:
        type === "telegram"
          ? { chatId: "", botToken: "" }
          : type === "discord"
            ? { webhookUrl: "" }
            : {},
      enabled: true,
      name: `My ${type.charAt(0).toUpperCase() + type.slice(1)} Channel`,
    };
    setChannels([...channels, newChannel]);
  };

  const removeChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index));
  };

  const updateChannel = (index: number, updates: Partial<Channel>) => {
    const updated = [...channels];
    updated[index] = { ...updated[index], ...updates };
    setChannels(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setMessage("Channels saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving channels: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {channels.map((channel, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 rounded-lg bg-gray-50"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={channel.name || ""}
                  onChange={(e) =>
                    updateChannel(index, { name: e.target.value })
                  }
                  className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  placeholder="Channel name"
                />
                <p className="text-xs text-gray-500 capitalize">
                  {channel.type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={(e) =>
                      updateChannel(index, { enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black/5 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                </label>
                <button
                  type="button"
                  onClick={() => removeChannel(index)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {channel.type === "telegram" && (
              <div className="space-y-2">
                {!channel.config.chatId ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-900 mb-2">
                      Click below to connect this channel with Telegram
                    </p>
                    <a
                      href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "pingapingbot"}?start=channel_${userId}_${index}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.55-1.06-.7-.37-1.09.22-1.7.15-.16 2.86-2.61 2.91-2.83.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.91 1.2-5.39 3.56-.51.35-.97.52-1.38.51-.45-.01-1.32-.26-1.96-.46-.79-.25-1.41-.38-1.36-.8.03-.22.33-.44.91-.67 3.55-1.54 5.92-2.56 7.1-3.08 3.37-1.47 4.07-1.78 4.54-1.78.1 0 .34.02.49.14.12.1.15.24.16.34 0 .07 0 .21-.01.31z" />
                      </svg>
                      Connect with Telegram
                    </a>
                    <p className="text-[10px] text-blue-700 mt-2">
                      Works with private chats and group chats
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Connected to Chat ID: {channel.config.chatId}
                    </div>
                    <input
                      type="password"
                      value={channel.config.botToken || ""}
                      onChange={(e) =>
                        updateChannel(index, {
                          config: {
                            ...channel.config,
                            botToken: e.target.value,
                          },
                        })
                      }
                      placeholder="Bot Token (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </>
                )}
              </div>
            )}

            {channel.type === "discord" && (
              <input
                type="text"
                value={channel.config.webhookUrl || ""}
                onChange={(e) =>
                  updateChannel(index, {
                    config: { ...channel.config, webhookUrl: e.target.value },
                  })
                }
                placeholder="Discord Webhook URL"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => addChannel("telegram")}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Add Telegram
        </button>
        <button
          type="button"
          onClick={() => addChannel("discord")}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Add Discord
        </button>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Channels
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
