import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = request.cookies.get("alfred_token")?.value;

  console.log("PROXY EXECUTOU:", pathname, "SESSION:", Boolean(session));

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/turmas/:path*",
    "/alunos/:path*",
    "/simulados/:path*",
  ],
};