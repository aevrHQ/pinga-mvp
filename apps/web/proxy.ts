import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Only protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      // Create the login URL with the return_to parameter
      const loginUrl = new URL("/login", request.url);

      // We want to return to the full path including search params (e.g. ?installation_id=...)
      loginUrl.searchParams.set(
        "return_to",
        request.nextUrl.pathname + request.nextUrl.search,
      );

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
