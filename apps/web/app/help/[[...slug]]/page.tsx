import { parseMarkdown } from "@/lib/markdown";
import fs from "fs/promises";
import path from "path";
import Link from "next/link";

interface HelpPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

const guides = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Set up your first notification channel in 5 minutes",
    icon: "🚀",
  },
  {
    slug: "filtering",
    title: "Webhook Filtering",
    description: "Control which events trigger notifications",
    icon: "🎯",
  },
  {
    slug: "telegram-groups",
    title: "Telegram Group Chats",
    description: "Connect team group chats for collaboration",
    icon: "👥",
  },
  {
    slug: "sources",
    title: "Webhook Sources",
    description: "Connect GitHub, Render, Vercel, and more",
    icon: "🔗",
  },
  {
    slug: "render",
    title: "Render Integration",
    description: "Setup guide for Render deployments",
    icon: "☁️",
  },
];

export default async function HelpPage({ params }: HelpPageProps) {
  const { slug: slugArray } = await params;
  const slug = slugArray?.[0];

  // If no slug, show help index
  if (!slug) {
    return (
      <div className="min-h-screen bg-white py-12 px-4 text-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold tracking-tight mb-4 text-black">
              Help Center
            </h1>
            <p className="text-xl text-gray-500">
              Everything you need to master your notification hub
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/help/${guide.slug}`}
                className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-black transition-all hover:shadow-sm"
              >
                <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">
                  {guide.icon}
                </div>
                <h2 className="text-2xl font-bold text-black mb-2">
                  {guide.title}
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">
                  {guide.description}
                </p>
                <div className="text-black font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                  Read guide
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
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl font-bold mb-6 text-black">Quick Links</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 text-gray-600 hover:text-black transition-colors"
              >
                <span className="text-xl">⚙️</span>
                <span className="font-medium">Settings Dashboard</span>
              </Link>
              <a
                href="https://github.com/yourrepo/pinga"
                className="flex items-center gap-3 text-gray-600 hover:text-black transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="text-xl">🐛</span>
                <span className="font-medium">Report an Issue</span>
              </a>
              <a
                href="https://t.me/pingacommunity"
                className="flex items-center gap-3 text-gray-600 hover:text-black transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="text-xl">💬</span>
                <span className="font-medium">Join Community</span>
              </a>
              <a
                href="mailto:support@pinga.app"
                className="flex items-center gap-3 text-gray-600 hover:text-black transition-colors"
              >
                <span className="text-xl">📧</span>
                <span className="font-medium">Email Support</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Load markdown content
  let html: string;
  let contentError = false;

  try {
    const contentPath = path.join(process.cwd(), "content", `${slug}.md`);
    const content = await fs.readFile(contentPath, "utf-8");
    html = await parseMarkdown(content);
  } catch {
    contentError = true;
  }

  // Handle error case
  if (contentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold mb-4">Guide Not Found</h1>
          <p className="text-gray-500 mb-8">
            The guide you&apos;re looking for doesn&apos;t exist yet.
          </p>
          <Link
            href="/help"
            className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  const guide = guides.find((g) => g.slug === slug);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
          <span className="font-semibold text-sm tracking-tight">
            Help Center
          </span>
        </div>
      </div>

      <div className="bg-gray-50/50 py-16 px-4 border-b border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          {guide && (
            <>
              <div className="text-5xl mb-6 grayscale hover:grayscale-0 transition-all cursor-default inline-block">
                {guide.icon}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-black">
                {guide.title}
              </h1>
              <p className="text-xl text-gray-500 max-w-lg mx-auto">
                {guide.description}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto py-16 px-6">
        <article
          className="prose prose-lg prose-gray max-w-none
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-black
            prose-h1:text-4xl prose-h1:mb-6
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-600 prose-p:leading-relaxed
            prose-a:text-black prose-a:underline hover:prose-a:text-gray-600
            prose-strong:text-black prose-strong:font-semibold
            prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:shadow-sm
            prose-blockquote:border-l-2 prose-blockquote:border-black prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:rounded-r-lg
            prose-ul:list-disc prose-ul:pl-0 prose-ul:space-y-2
            prose-li:text-gray-600 prose-li:pl-2
            prose-img:rounded-xl prose-img:shadow-sm prose-img:border prose-img:border-gray-100
            "
          dangerouslySetInnerHTML={{ __html: html! }}
        />
      </div>

      {/* Footer Navigation */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-t border-gray-100">
        <h3 className="text-lg font-bold mb-6 text-black">More Guides</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {guides
            .filter((g) => g.slug !== slug)
            .slice(0, 3)
            .map((guide) => (
              <Link
                key={guide.slug}
                href={`/help/${guide.slug}`}
                className="group p-6 border border-gray-100 rounded-xl hover:border-black transition-all"
              >
                <div className="text-3xl mb-3 grayscale group-hover:grayscale-0 transition-all">
                  {guide.icon}
                </div>
                <h4 className="font-bold text-black mb-1 group-hover:underline decoration-1 underline-offset-4">
                  {guide.title}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {guide.description}
                </p>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
