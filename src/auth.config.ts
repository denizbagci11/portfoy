import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/analiz") || nextUrl.pathname.startsWith("/transactions");
            const isOnLogin = nextUrl.pathname.startsWith("/login");
            const isOnAdmin = nextUrl.pathname.startsWith("/admin");

            if (isOnDashboard || isOnAdmin) {
                if (isLoggedIn) {
                    // Admin check for /admin path
                    if (isOnAdmin && (auth?.user as any)?.role !== 'admin') {
                        return Response.redirect(new URL("/", nextUrl));
                    }
                    return true;
                }
                return false;
            } else if (isOnLogin) {
                if (isLoggedIn) {
                    return Response.redirect(new URL("/", nextUrl));
                }
                return true;
            }
            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user && token.role) {
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    providers: [], // Placeholder for type safety
} satisfies NextAuthConfig;
