import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="font-bold text-xl tracking-tight"
            >
              Pinga
            </Link>
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-black transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-gray-600 hover:text-black transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline-block">
              {user.email}
            </span>
            <form
              action={async () => {
                "use server";
                const { cookies } = await import("next/headers");
                (await cookies()).delete("token");
                redirect("/login");
              }}
            >
              <button
                type="submit"
                className="text-sm cursor-pointer font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
