import type { WebhookAnalyzer, AnalyzerResult } from "../analyzers";

interface GitHubPayload {
  action?: string;
  ref?: string;
  compare?: string;
  repository?: { full_name?: string; html_url?: string };
  sender?: { login?: string };
  pusher?: { name?: string };
  head_commit?: { id?: string; message?: string; url?: string };
  commits?: Array<{ id?: string; message?: string; url?: string }>;
  pull_request?: {
    number?: number;
    title?: string;
    html_url?: string;
    merged?: boolean;
    user?: { login?: string };
    base?: { ref?: string };
    head?: { ref?: string };
  };
  release?: {
    tag_name?: string;
    name?: string;
    html_url?: string;
    prerelease?: boolean;
  };
  deployment?: { environment?: string; ref?: string };
  deployment_status?: {
    state?: string;
    description?: string;
    environment_url?: string;
    log_url?: string;
  };
  issue?: {
    number?: number;
    title?: string;
    html_url?: string;
    state?: string;
  };
  installation?: { id?: number; account?: { login?: string } };
  installation_repositories?: {
    repositories_added?: Array<{ full_name: string }>;
    repositories_removed?: Array<{ full_name: string }>;
  };
  check_run?: {
    status?: string;
    conclusion?: string;
    name?: string;
    html_url?: string;
    check_suite?: { head_branch?: string };
  };
  workflow_run?: {
    status?: string;
    conclusion?: string;
    name?: string;
    html_url?: string;
    head_branch?: string;
  };
}

const eventEmojis: Record<string, string> = {
  push: "📤",
  pull_request: "🔀",
  release: "🏷️",
  deployment: "🚀",
  deployment_status: "📊",
  issues: "🐛",
  star: "⭐",
  fork: "🍴",
  installation: "🔌",
  installation_repositories: "🔌",
  check_run: "✅",
  workflow_run: "⚙️",
};

export const githubAnalyzer: WebhookAnalyzer = {
  name: "github",

  canHandle(_payload: unknown, headers: Record<string, string>): boolean {
    return (
      "x-github-event" in headers ||
      "x-github-delivery" in headers ||
      headers["user-agent"]?.includes("GitHub-Hookshot")
    );
  },

  analyze(payload: unknown, headers: Record<string, string>): AnalyzerResult {
    const p = payload as GitHubPayload;
    const eventType = headers["x-github-event"] || "unknown";
    const emoji = eventEmojis[eventType] || "📡";

    switch (eventType) {
      case "push":
        return analyzePush(p, emoji);
      case "pull_request":
        return analyzePR(p, emoji);
      case "release":
        return analyzeRelease(p, emoji);
      case "deployment_status":
        return analyzeDeployStatus(p);
      case "installation":
      case "installation_repositories":
        return analyzeInstallation(p, eventType, emoji);
      case "workflow_run":
        return analyzeWorkflow(p, emoji);
      default:
        return analyzeGeneric(p, eventType, emoji);
    }
  },
};

function analyzePush(p: GitHubPayload, emoji: string): AnalyzerResult {
  const branch = p.ref?.replace("refs/heads/", "") || "unknown";
  const repo = p.repository?.full_name || "unknown";
  const fields = [
    { label: "📦 Repo", value: repo },
    { label: "🌿 Branch", value: branch },
  ];
  if (p.commits?.length)
    fields.push({ label: "📝 Commits", value: `${p.commits.length}` });
  if (p.head_commit?.message)
    fields.push({
      label: "💬 Latest",
      value: truncate(p.head_commit.message.split("\n")[0], 50),
    });
  if (p.pusher?.name) fields.push({ label: "👤 By", value: p.pusher.name });

  const links = [];
  if (p.compare) links.push({ label: "Compare", url: p.compare });
  if (p.head_commit?.url)
    links.push({ label: "Commit", url: p.head_commit.url });

  return {
    source: "github",
    notification: { title: `Push to ${branch}`, emoji, fields, links },
  };
}

function analyzePR(p: GitHubPayload, emoji: string): AnalyzerResult {
  const pr = p.pull_request;
  const action = p.action || "updated";
  let title = `PR ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  if (action === "closed" && pr?.merged) {
    title = "PR Merged";
    emoji = "✅";
  }

  const fields = [];
  if (pr?.title)
    fields.push({ label: "📋 Title", value: truncate(pr.title, 50) });
  if (pr?.number) fields.push({ label: "#️⃣", value: `#${pr.number}` });
  if (pr?.head?.ref && pr?.base?.ref)
    fields.push({ label: "🔀", value: `${pr.head.ref} → ${pr.base.ref}` });
  if (pr?.user?.login) fields.push({ label: "👤", value: pr.user.login });

  const links = pr?.html_url ? [{ label: "View PR", url: pr.html_url }] : [];
  return { source: "github", notification: { title, emoji, fields, links } };
}

function analyzeRelease(p: GitHubPayload, emoji: string): AnalyzerResult {
  const r = p.release;
  const fields = [];
  if (r?.tag_name) fields.push({ label: "🏷️ Version", value: r.tag_name });
  if (r?.name) fields.push({ label: "📋 Name", value: r.name });
  if (p.repository?.full_name)
    fields.push({ label: "📦 Repo", value: p.repository.full_name });

  const links = r?.html_url ? [{ label: "Release", url: r.html_url }] : [];
  return {
    source: "github",
    notification: { title: "Release Published", emoji, fields, links },
  };
}

function analyzeDeployStatus(p: GitHubPayload): AnalyzerResult {
  const s = p.deployment_status;
  const state = s?.state || "unknown";
  const emoji = state === "success" ? "✅" : state === "failure" ? "❌" : "🔄";

  const fields = [];
  if (p.deployment?.environment)
    fields.push({ label: "🎯 Env", value: p.deployment.environment });
  if (p.deployment?.ref)
    fields.push({ label: "🌿 Ref", value: p.deployment.ref });
  if (s?.description)
    fields.push({ label: "📝", value: truncate(s.description, 50) });

  const links = [];
  if (s?.environment_url)
    links.push({ label: "Preview", url: s.environment_url });
  if (s?.log_url) links.push({ label: "Logs", url: s.log_url });

  return {
    source: "github",
    notification: { title: `Deploy ${state}`, emoji, fields, links },
  };
}

function analyzeGeneric(
  p: GitHubPayload,
  eventType: string,
  emoji: string
): AnalyzerResult {
  const fields = [];
  if (p.repository?.full_name)
    fields.push({ label: "📦 Repo", value: p.repository.full_name });
  if (p.action) fields.push({ label: "⚡", value: p.action });
  if (p.sender?.login) fields.push({ label: "👤", value: p.sender.login });

  const links = p.repository?.html_url
    ? [{ label: "Repo", url: p.repository.html_url }]
    : [];
  return {
    source: "github",
    notification: { title: formatEventType(eventType), emoji, fields, links },
  };
}

function analyzeInstallation(
  p: GitHubPayload,
  type: string,
  emoji: string
): AnalyzerResult {
  const fields = [];
  const account = p.installation?.account?.login || "unknown";

  fields.push({ label: "👤 Account", value: account });

  if (type === "installation") {
    const action = "action" in p ? (p as { action: string }).action : "updated";
    fields.push({ label: "⚡ Action", value: action });
  } else if (type === "installation_repositories") {
    const added = p.installation_repositories?.repositories_added?.length || 0;
    const removed =
      p.installation_repositories?.repositories_removed?.length || 0;
    if (added > 0)
      fields.push({ label: "➕ Added", value: `${added} repo(s)` });
    if (removed > 0)
      fields.push({ label: "➖ Removed", value: `${removed} repo(s)` });
  }

  return {
    source: "github",
    notification: {
      title: "GitHub App Installation",
      emoji,
      fields,
      links: [],
    },
  };
}

function analyzeWorkflow(p: GitHubPayload, emoji: string): AnalyzerResult {
  const w = p.workflow_run;
  const status = w?.status || "unknown";
  const conclusion = w?.conclusion || "pending";

  if (conclusion === "success") emoji = "✅";
  else if (conclusion === "failure") emoji = "❌";

  const fields = [
    { label: "⚙️ Workflow", value: w?.name || "unknown" },
    {
      label: "📊 Status",
      value: conclusion !== "pending" ? conclusion : status,
    },
  ];

  if (w?.head_branch) fields.push({ label: "🌿 Branch", value: w.head_branch });
  if (p.repository?.full_name)
    fields.push({ label: "📦 Repo", value: p.repository.full_name });

  const links = w?.html_url ? [{ label: "Details", url: w.html_url }] : [];
  return {
    source: "github",
    notification: { title: "Workflow Run", emoji, fields, links },
  };
}

function formatEventType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 3) + "...";
}
