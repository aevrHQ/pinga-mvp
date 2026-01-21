"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import WebhookFilterForm from "./WebhookFilterForm";

interface Channel {
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  name?: string;
  webhookRules?: {
    sources: {
      type: string;
      enabled: boolean;
      filters: {
        repositories?: string[];
        eventTypes?: string[];
        services?: string[];
        [key: string]: unknown;
      };
    }[];
  };
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
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const autoSaveTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Auto-save when channels change
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Don't auto-save on initial mount
    if (JSON.stringify(channels) === JSON.stringify(initialChannels)) {
      return;
    }

    // Set new timer for auto-save (1 second debounce)
    autoSaveTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const res = await fetch("/api/user/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channels }),
        });

        if (res.ok) {
          setMessage("✓ Auto-saved");
          setTimeout(() => setMessage(""), 2000);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [channels, initialChannels]);

  const addChannel = (type: string) => {
    const newChannel: Channel = {
      type,
      config:
        type === "telegram"
          ? { chatId: "", botToken: "" }
          : type === "discord"
            ? { webhookUrl: "" }
            : type === "slack"
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

  return (
    <div className="space-y-6">
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
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-700">
                  Chat Type
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`chat-type-${index}`}
                      checked={
                        !(channel.config as Record<string, unknown>).isGroupChat
                      }
                      onChange={() =>
                        updateChannel(index, {
                          config: {
                            ...channel.config,
                            isGroupChat: false,
                          },
                        })
                      }
                      className="rounded-full border-gray-300"
                    />
                    <span className="text-sm">Personal DM</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`chat-type-${index}`}
                      checked={
                        !!(channel.config as Record<string, unknown>)
                          .isGroupChat
                      }
                      onChange={() =>
                        updateChannel(index, {
                          config: {
                            ...channel.config,
                            isGroupChat: true,
                          },
                        })
                      }
                      className="rounded-full border-gray-300"
                    />
                    <span className="text-sm">Group Chat</span>
                  </label>
                </div>

                {!(channel.config as Record<string, unknown>).chatId ? (
                  (channel.config as Record<string, unknown>).isGroupChat ? (
                    // Group Chat Instructions
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <p className="text-sm text-blue-900 font-medium">
                        📋 Steps to connect group chat:
                      </p>
                      <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                        <li>
                          Add @
                          {process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ||
                            "pingapingbot"}{" "}
                          to your Telegram group
                        </li>
                        <li>In the group, send this command:</li>
                      </ol>
                      <div className="bg-white p-3 rounded border border-blue-300 font-mono text-xs break-all">
                        /start channel_{userId}_{index}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `/start channel_${userId}_${index}`,
                          );
                          alert("Command copied! Paste it in your group chat.");
                        }}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        📋 Copy Command
                      </button>
                      <p className="text-xs text-blue-700">
                        💡 The bot will confirm when connected successfully
                      </p>
                    </div>
                  ) : (
                    // Personal DM Button
                    <div className="space-y-2">
                      <a
                        href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "pingapingbot"}?start=channel_${userId}_${index}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        Connect with Telegram
                      </a>
                      <p className="text-xs text-gray-500">
                        Click to open Telegram and connect this channel
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
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
                      Connected to{" "}
                      {(channel.config as Record<string, unknown>).isGroupChat
                        ? "Group"
                        : "DM"}
                      :{" "}
                      {String(
                        (channel.config as Record<string, unknown>).chatId ||
                          "",
                      )}
                    </div>
                    <input
                      type="password"
                      value={
                        ((channel.config as Record<string, unknown>)
                          .botToken as string) || ""
                      }
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
                  </div>
                )}

                {/* Webhook Filtering */}
                <WebhookFilterForm
                  channelIndex={index}
                  currentRules={channel.webhookRules}
                  onUpdate={(rules) =>
                    updateChannel(index, { webhookRules: rules })
                  }
                />
              </div>
            )}

            {channel.type === "discord" && (
              <input
                type="text"
                value={
                  ((channel.config as Record<string, unknown>)
                    .webhookUrl as string) || ""
                }
                onChange={(e) =>
                  updateChannel(index, {
                    config: { ...channel.config, webhookUrl: e.target.value },
                  })
                }
                placeholder="Discord Webhook URL"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            )}

            {channel.type === "slack" && (
              <div className="space-y-4">
                {(channel.config as Record<string, unknown>).webhookUrl ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-100">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected to{" "}
                    <span className="font-medium">
                      {String(
                        (channel.config as Record<string, unknown>).teamName ||
                          "Workspace",
                      )}
                    </span>
                    {String(
                      (channel.config as Record<string, unknown>).channelName ||
                        "",
                    )
                      ? ` (#${String((channel.config as Record<string, unknown>).channelName)})`
                      : ""}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <a
                      href={`https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=incoming-webhook,commands,chat:write&redirect_uri=${origin}/api/auth/slack/callback&state=channel_${userId}_${index}`}
                      className="w-full text-center px-4 py-2.5 bg-[#4A154B] hover:bg-[#361139] text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.527 2.527 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.52v-6.315zm8.833-2.52a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521h-2.521v-2.521zm-1.26 2.521a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V6.315a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521v6.315zm6.311-8.835a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.52H17.687v-2.52a2.528 2.528 0 0 1-2.52-2.521zm-2.521 1.26a2.528 2.528 0 0 1-2.521-2.52 2.528 2.528 0 0 1-2.521-2.52v-2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v2.522z" />
                      </svg>
                      Connect Slack
                    </a>
                    <p className="text-xs text-gray-500 text-center">
                      You&apos;ll be redirected to Slack to authorize Pinga
                    </p>
                  </div>
                )}
                {/* Webhook Filtering for Slack */}
                <WebhookFilterForm
                  channelIndex={index}
                  currentRules={channel.webhookRules}
                  onUpdate={(rules) =>
                    updateChannel(index, { webhookRules: rules })
                  }
                />
              </div>
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
        <button
          type="button"
          onClick={() => addChannel("slack")}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Add Slack
        </button>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t">
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}
        {message && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
