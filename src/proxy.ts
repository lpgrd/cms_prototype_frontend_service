import { NextRequest, NextResponse } from "next/server";

// Optimistic check only: the API authorises every request. This just avoids flashing
// portal pages to visitors who obviously have no session.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("jp_session")) {
    // The partner area has its own sign-in page.
    const partnerArea = request.nextUrl.pathname === "/partner" || request.nextUrl.pathname.startsWith("/partner/");
    const login = new URL(partnerArea ? "/partner/login" : "/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|login|partner/login|forgot-password|reset-password|r/|_next|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
