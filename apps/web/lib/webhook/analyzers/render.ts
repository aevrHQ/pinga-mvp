import type { WebhookAnalyzer, AnalyzerResult } from "../analyzers";

interface RenderPayload {
  type?: string;
  timestamp?: string;
  source?: string;
  subject?: string;
  data?: {
    id?: string;
    serviceId?: string;
    serviceName?: string;
    status?: "succeeded" | "failed" | "canceled" | "pending" | string;
    url?: string;
  };
}

const eventEmojis: Record<string, string> = {
  deploy_started: "🔄",
  deploy_ended: "🚀",
  build_started: "🔨",
  build_ended: "📦",
  server_available: "✅",
  server_unavailable: "❌",
  suspend_started: "⏸️",
  suspend_ended: "▶️",
};

const statusEmojis: Record<string, string> = {
  succeeded: "✅",
  failed: "❌",
  canceled: "⚪",
};

const eventTitles: Record<string, string> = {
  deploy_started: "Deploy Started",
  deploy_ended: "Deploy Completed",
  build_started: "Build Started",
  build_ended: "Build Completed",
  server_available: "Server Available",
  server_unavailable: "Server Unavailable",
};

export const renderAnalyzer: WebhookAnalyzer = {
  name: "render",

  canHandle(payload: unknown, headers: Record<string, string>): boolean {
    const p = payload as RenderPayload;
    if (headers["webhook-id"]?.startsWith("evt-")) return true;

    // Check for email forwarded payload
    if (p?.source === "render-email") return true;

    return (
      typeof p?.type === "string" &&
      typeof p?.data?.serviceId === "string" &&
      (p.type.includes("deploy") ||
        p.type.includes("build") ||
        p.type.includes("server"))
    );
  },

  analyze(payload: unknown): AnalyzerResult {
    const p = payload as RenderPayload;

    // Handle email payloads
    if (p.source === "render-email") {
      return analyzeEmailPayload(p);
    }

    const type = p.type || "unknown";
    const data = p.data || {};

    let emoji = eventEmojis[type] || "📡";
    let title = eventTitles[type] || formatEventType(type);

    if (type.endsWith("_ended") && data.status) {
      emoji = statusEmojis[data.status] || emoji;
      title = title.replace(
        "Completed",
        data.status.charAt(0).toUpperCase() + data.status.slice(1)
      );
    }

    const fields: { label: string; value: string }[] = [];
    const links: { label: string; url: string }[] = [];

    if (data.serviceName) {
      fields.push({ label: "📦 Service", value: data.serviceName });
    }
    fields.push({ label: "📋 Event", value: formatEventType(type) });
    if (data.status) {
      fields.push({ label: "📊 Status", value: data.status });
    }
    if (data.serviceId) {
      links.push({
        label: "Render Dashboard",
        url: `https://dashboard.render.com/web/${data.serviceId}`,
      });
    }

    return { source: "render", notification: { title, emoji, fields, links } };
  },
};

function analyzeEmailPayload(p: RenderPayload): AnalyzerResult {
  const data = p.data || {};
  const status = data.status || "unknown";

  let emoji = "📡";
  const title = p.subject || "Render Notification";

  if (status === "succeeded") emoji = "✅";
  else if (status === "failed") emoji = "❌";
  else if (status === "pending") emoji = "🔄";

  const fields: { label: string; value: string }[] = [];
  const links: { label: string; url: string }[] = [];

  if (data.serviceName) {
    fields.push({ label: "📦 Service", value: data.serviceName });
  }

  fields.push({ label: "📊 Status", value: status.toUpperCase() });

  if (data.url) {
    links.push({ label: "Dashboard", url: data.url });
  }

  return {
    source: "render-email",
    notification: { title, emoji, fields, links },
  };
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
