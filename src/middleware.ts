import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

function isProtectedAppRoute(pathname: string) {
  return (
    pathname.startsWith("/dogs") ||
    pathname.startsWith("/guide") ||
    pathname.startsWith("/hunts") ||
    pathname.startsWith("/hunt") ||
    pathname.startsWith("/check-in") ||
    pathname.startsWith("/journey") ||
    pathname.startsWith("/receipts") ||
    pathname.startsWith("/rewards") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/wallet")
  );
}

function isStaffRole(role: string | undefined) {
  return role === "STAFF" || role === "ADMIN";
}

function isAdminRole(role: string | undefined) {
  return role === "ADMIN";
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    if (pathname.startsWith("/admin/push") && !isAdminRole(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("access", "admin_required");
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && !isStaffRole(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("access", "staff_required");
      return NextResponse.redirect(url);
    }
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        if (pathname.startsWith("/admin")) {
          return !!token;
        }

        if (
          pathname === "/wallet/top-up/success" &&
          req.nextUrl.searchParams.has("token")
        ) {
          return true;
        }

        if (isProtectedAppRoute(pathname)) {
          return !!token;
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: [
    "/dogs/:path*",
    "/guide/:path*",
    "/hunts/:path*",
    "/hunt/:path*",
    "/check-in/:path*",
    "/journey/:path*",
    "/receipts/:path*",
    "/rewards/:path*",
    "/account/:path*",
    "/wallet/:path*",
    "/admin/:path*",
  ],
};
