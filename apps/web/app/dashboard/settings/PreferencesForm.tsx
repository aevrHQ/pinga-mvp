"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

interface Preferences {
  aiSummary: boolean;
  allowedSources: string[];
}

interface PreferencesFormProps {
  initialPreferences: Preferences;
}

export default function PreferencesForm({
  initialPreferences,
}: PreferencesFormProps) {
  const [preferences, setPreferences] =
    useState<Preferences>(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newSource, setNewSource] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setMessage("Preferences savedsuccessfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving preferences: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSource = () => {
    if (newSource && !preferences.allowedSources.includes(newSource)) {
      setPreferences({
        ...preferences,
        allowedSources: [...preferences.allowedSources, newSource],
      });
      setNewSource("");
    }
  };

  const removeSource = (source: string) => {
    setPreferences({
      ...preferences,
      allowedSources: preferences.allowedSources.filter((s) => s !== source),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">
              AI-Generated Summaries
            </label>
            <p className="text-xs text-gray-500">
              Get concise summaries of notifications instead of raw data
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.aiSummary}
              onChange={(e) =>
                setPreferences({ ...preferences, aiSummary: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black/5 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Allowed Sources
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Leave empty to receive notifications from all sources. Add specific
            sources to filter.
          </p>

          <div className="space-y-2">
            {preferences.allowedSources.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {preferences.allowedSources.map((source) => (
                  <span
                    key={source}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-sm rounded-full"
                  >
                    {source}
                    <button
                      type="button"
                      onClick={() => removeSource(source)}
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="e.g., github, vercel, render"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSource();
                  }
                }}
              />
              <button
                type="button"
                onClick={addSource}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
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
          Save Preferences
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
